import { storage } from "./storage";
import { sendBookingConfirmationEmail } from "./email";
import { whatsappService } from "./whatsapp";

// Shared by both reconciliation functions below - pages through every
// Razorpay payment captured in the window, so each caller doesn't repeat
// its own copy of the pagination/auth boilerplate.
async function fetchCapturedRazorpayPayments(days: number): Promise<any[]> {
  const gateway = await storage.getPaymentGatewayByName("razorpay");
  if (!gateway || !gateway.publicKey || !gateway.secretKey) {
    throw new Error("Razorpay gateway is not configured");
  }

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const auth = Buffer.from(`${gateway.publicKey}:${gateway.secretKey}`).toString("base64");

  const items: any[] = [];
  let skip = 0;
  const count = 100;
  // Razorpay caps a single page at 100; page through until we've seen
  // everything in range, with a hard ceiling so a runaway account can't
  // turn this into an unbounded loop.
  while (items.length < 2000) {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments?from=${from}&to=${to}&count=${count}&skip=${skip}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay API error (${response.status}): ${text}`);
    }
    const data = await response.json();
    const pageItems = data.items || [];
    items.push(...pageItems);
    if (pageItems.length < count) break;
    skip += count;
  }

  return items.filter((p: any) => p.status === "captured");
}

export interface UnmatchedPayment {
  paymentId: string;
  orderId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  receipt: string | null;
  email: string | null;
  contact: string | null;
}

export interface RefundNeededPayment extends UnmatchedPayment {
  bookingId: string;
  guestName: string | null;
}

export interface ReconciliationResult {
  checkedFrom: string;
  checkedTo: string;
  totalCaptured: number;
  unmatchedCount: number;
  unmatched: UnmatchedPayment[];
  refundNeededCount: number;
  refundNeeded: RefundNeededPayment[];
}

const RESOLVED_PAYMENT_STATUSES = ["paid_online", "paid", "paid_checkin", "refunded"];

// The internal defense against a captured-but-unrecorded payment (booking
// created before charging, the webhook secret coming from the DB, DB-write
// failures no longer being swallowed) all depend on specific code paths
// working correctly. This is the independent backstop: it asks Razorpay
// itself what it actually captured and checks that against our own records,
// so a gap can never go unnoticed again even if caused by some future,
// unrelated bug.
export async function findUnmatchedRazorpayPayments(
  days: number = 14
): Promise<ReconciliationResult> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const captured = await fetchCapturedRazorpayPayments(days);
  const dismissedIds = await storage.getDismissedReconciliationPaymentIds();

  const unmatched: UnmatchedPayment[] = [];
  const refundNeeded: RefundNeededPayment[] = [];

  for (const payment of captured) {
    if (dismissedIds.has(payment.id)) continue;

    // A payment can be accounted for two different ways, because bookings
    // created under the pre-7b57062 flow (pay first, create the booking
    // afterward) never got a payment_transactions row at all - only
    // room_bookings.paymentReference proves they were ever recorded. Only
    // checking payment_transactions (the original version of this function)
    // misclassified every one of those as orphaned, even though a real,
    // correctly-paid booking existed - see the pay_TRduaFQJkcsiaS incident.
    const transaction = payment.order_id
      ? await storage.getPaymentTransactionByOrderId(payment.order_id)
      : undefined;
    const matchedViaTransaction = !!transaction && ["completed", "success"].includes(transaction.status);

    const booking = await storage.getRoomBookingByPaymentReference(payment.id);

    if (matchedViaTransaction || (booking && RESOLVED_PAYMENT_STATUSES.includes(booking.paymentStatus))) {
      continue; // genuinely accounted for, either way
    }

    const basePayment: UnmatchedPayment = {
      paymentId: payment.id,
      orderId: payment.order_id || null,
      amount: payment.amount / 100,
      currency: payment.currency,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      receipt: payment.notes?.receipt || null,
      email: payment.email || null,
      contact: payment.contact || null,
    };

    if (booking && booking.paymentStatus === "refund_failed") {
      // A booking exists and a refund was already attempted and failed -
      // this is a different, already-diagnosed problem (go retry/complete
      // the refund), not "no booking found anywhere". Surfacing it in the
      // same bucket as a genuinely orphaned payment would hide that
      // distinction from whoever's triaging the alert.
      refundNeeded.push({
        ...basePayment,
        bookingId: booking.bookingId,
        guestName: booking.primaryGuestName || null,
      });
    } else {
      // Either no booking exists at all, or one exists but is in some other
      // unresolved state (e.g. still "unpaid" despite a captured payment) -
      // both are genuinely worth flagging as "go investigate this".
      unmatched.push(basePayment);
    }
  }

  return {
    checkedFrom: new Date(from * 1000).toISOString(),
    checkedTo: new Date(to * 1000).toISOString(),
    totalCaptured: captured.length,
    unmatchedCount: unmatched.length,
    unmatched,
    refundNeededCount: refundNeeded.length,
    refundNeeded,
  };
}

export interface AutoResolvedPayment {
  paymentId: string;
  bookingId: string;
  amount: number;
}

export interface AutoResolveResult {
  checked: number;
  resolved: AutoResolvedPayment[];
}

// The active backup for the webhook: rather than only waiting for Razorpay
// to push a payment.captured event (which depends on the webhook being
// enabled and reachable) or for the guest's own browser to report success
// (which depends on it staying open long enough to do so), this reaches
// out to Razorpay directly and asks what it actually captured, then heals
// any booking that's still "unpaid" despite a real captured payment. Meant
// to run on a short interval (see scheduledTasks.ts) so a payment that
// slips through both of the other paths is caught within minutes rather
// than sitting invisible until someone notices - see the Nisha Nahar
// booking (SSH-1789365893695-WRJ10XMOL), stuck unpaid for 3 days because
// both other paths failed at once.
//
// Deliberately conservative about what it touches: only a payment whose
// receipt note resolves to a real, existing booking that's still
// genuinely unresolved. A payment with no matching booking at all is left
// for a human (findUnmatchedRazorpayPayments) rather than auto-creating
// anything, and a booking already in a resolved state is left untouched
// so this can never clobber or duplicate work the fast paths already did.
export async function autoResolvePendingRazorpayPayments(
  days: number = 2
): Promise<AutoResolveResult> {
  const captured = await fetchCapturedRazorpayPayments(days);
  const resolved: AutoResolvedPayment[] = [];

  for (const payment of captured) {
    const receipt: string = payment.notes?.receipt || "";
    const match = receipt.match(/^booking_(.+)/);
    if (!match) continue;

    const booking = await storage.getRoomBookingByBookingId(match[1]);
    if (!booking || RESOLVED_PAYMENT_STATUSES.includes(booking.paymentStatus)) continue;

    const updatedBooking = await storage.updateRoomBooking(booking.id, {
      paymentStatus: "paid_online",
      paymentReference: payment.id,
    });

    if (payment.order_id) {
      const transaction = await storage.getPaymentTransactionByOrderId(payment.order_id);
      if (transaction && !["completed", "success"].includes(transaction.status)) {
        await storage.updatePaymentTransaction(transaction.id, {
          status: "completed",
          gatewayTransactionId: payment.id,
          gatewayResponse: JSON.stringify(payment),
        });
      }
    }

    resolved.push({ paymentId: payment.id, bookingId: booking.bookingId, amount: payment.amount / 100 });

    // Same "tell the guest their booking is confirmed" step the client-verify
    // and webhook paths both do - a booking healed this way still needs it,
    // it just never got sent by either of the other two.
    try {
      const [bookingUser, bookingCategory] = await Promise.all([
        storage.getUser(updatedBooking.userId),
        storage.getRoomCategory(updatedBooking.roomCategoryId),
      ]);
      if (bookingCategory) {
        await sendBookingConfirmationEmail({ booking: updatedBooking, user: bookingUser || null, category: bookingCategory });
        await whatsappService.sendBookingConfirmation(updatedBooking, bookingUser || null, bookingCategory);
      }
    } catch (notifyError) {
      console.error(`Auto-reconcile: payment recorded for booking ${booking.bookingId} but confirmation notification failed:`, notifyError);
    }
  }

  return { checked: captured.length, resolved };
}
