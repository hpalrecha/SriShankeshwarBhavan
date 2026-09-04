// Verifies findUnmatchedRazorpayPayments' matching logic against the 4 cases
// that motivated this fix (see the pay_TRduaFQJkcsiaS incident): a payment
// can be genuinely accounted for via payment_transactions OR via
// room_bookings.paymentReference, and a "refund_failed" booking must be
// reported separately from a truly orphaned payment, not lumped into either
// bucket. No real network/DB access - storage and fetch are stubbed below.
//
// Run with: npx tsx server/test-reconciliation-matching.ts

import { storage } from "./storage";
import { findUnmatchedRazorpayPayments } from "./payment-reconciliation";

const FAKE_GATEWAY = {
  id: 1,
  gatewayName: "razorpay",
  publicKey: "rzp_test_fake",
  secretKey: "fake_secret",
} as any;

// Four captured payments, one per case below.
const FAKE_PAYMENTS = [
  {
    id: "pay_case1_txn_match",
    order_id: "order_case1",
    status: "captured",
    amount: 100000,
    currency: "INR",
    created_at: 1700000000,
    notes: {},
    email: "case1@example.com",
    contact: "+911111111111",
  },
  {
    id: "pay_case2_booking_match",
    order_id: "order_case2",
    status: "captured",
    amount: 100000,
    currency: "INR",
    created_at: 1700000100,
    notes: {},
    email: "case2@example.com",
    contact: "+912222222222",
  },
  {
    id: "pay_case3_orphaned",
    order_id: "order_case3",
    status: "captured",
    amount: 80000,
    currency: "INR",
    created_at: 1700000200,
    notes: {},
    email: "case3@example.com",
    contact: "+913333333333",
  },
  {
    id: "pay_case4_refund_failed",
    order_id: "order_case4",
    status: "captured",
    amount: 1000,
    currency: "INR",
    created_at: 1700000300,
    notes: {},
    email: "case4@example.com",
    contact: "+914444444444",
  },
];

async function run() {
  const originalFetch = global.fetch;
  const originalGetGateway = storage.getPaymentGatewayByName;
  const originalGetTxnByOrder = storage.getPaymentTransactionByOrderId;
  const originalGetBookingByRef = storage.getRoomBookingByPaymentReference;

  // Stub the Razorpay API call
  global.fetch = (async (url: string) => {
    if (String(url).includes("/v1/payments")) {
      return {
        ok: true,
        json: async () => ({ items: FAKE_PAYMENTS }),
      } as any;
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as any;

  storage.getPaymentGatewayByName = (async (name: string) => {
    if (name === "razorpay") return FAKE_GATEWAY;
    return undefined;
  }) as any;

  // Case 1: matched via payment_transactions, no booking needed.
  // Case 2: no transaction row, but a booking exists with paymentReference
  //         set and a resolved paymentStatus - the exact Aradhana/Aadish shape.
  // Case 3: neither exists anywhere - genuinely orphaned.
  // Case 4: no transaction row, booking exists but paymentStatus is
  //         "refund_failed" - must land in refundNeeded, not unmatched, and
  //         must NOT be silently treated as matched either.
  storage.getPaymentTransactionByOrderId = (async (orderId: string) => {
    if (orderId === "order_case1") {
      return { id: 1, status: "completed" } as any;
    }
    return undefined;
  }) as any;

  storage.getRoomBookingByPaymentReference = (async (ref: string) => {
    if (ref === "pay_case2_booking_match") {
      return { bookingId: "SSH-CASE2", paymentStatus: "paid_online", primaryGuestName: "Case Two" } as any;
    }
    if (ref === "pay_case4_refund_failed") {
      return { bookingId: "SSH-CASE4", paymentStatus: "refund_failed", primaryGuestName: "Case Four" } as any;
    }
    return undefined; // case1 (transaction already matches it) and case3
  }) as any;

  let failures = 0;
  function check(label: string, condition: boolean) {
    console.log(`${condition ? "✅ PASS" : "❌ FAIL"} - ${label}`);
    if (!condition) failures++;
  }

  try {
    const result = await findUnmatchedRazorpayPayments(1);

    check("total captured is 4", result.totalCaptured === 4);

    check(
      "case1 (payment_transactions match) is not in unmatched or refundNeeded",
      !result.unmatched.some((p) => p.paymentId === "pay_case1_txn_match") &&
        !result.refundNeeded.some((p) => p.paymentId === "pay_case1_txn_match")
    );

    check(
      "case2 (room_bookings.paymentReference match, no transaction row) is not in unmatched or refundNeeded",
      !result.unmatched.some((p) => p.paymentId === "pay_case2_booking_match") &&
        !result.refundNeeded.some((p) => p.paymentId === "pay_case2_booking_match")
    );

    check(
      "case3 (no transaction, no booking) is in unmatched",
      result.unmatched.some((p) => p.paymentId === "pay_case3_orphaned")
    );
    check(
      "case3 is not in refundNeeded",
      !result.refundNeeded.some((p) => p.paymentId === "pay_case3_orphaned")
    );

    check(
      "case4 (booking exists but refund_failed) is in refundNeeded",
      result.refundNeeded.some((p) => p.paymentId === "pay_case4_refund_failed")
    );
    check(
      "case4 is not in unmatched",
      !result.unmatched.some((p) => p.paymentId === "pay_case4_refund_failed")
    );

    check("unmatchedCount matches unmatched.length", result.unmatchedCount === result.unmatched.length);
    check("refundNeededCount matches refundNeeded.length", result.refundNeededCount === result.refundNeeded.length);
    check("unmatchedCount is exactly 1 (only case3)", result.unmatchedCount === 1);
    check("refundNeededCount is exactly 1 (only case4)", result.refundNeededCount === 1);
  } finally {
    global.fetch = originalFetch;
    storage.getPaymentGatewayByName = originalGetGateway;
    storage.getPaymentTransactionByOrderId = originalGetTxnByOrder;
    storage.getRoomBookingByPaymentReference = originalGetBookingByRef;
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
