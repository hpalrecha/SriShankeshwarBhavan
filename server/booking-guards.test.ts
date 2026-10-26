import assert from "node:assert/strict";
import {
  lastNightEnd,
  applyGuestBookingDefaults,
  isSettledTransaction,
  paidAmountMatches,
  orderMatchesTransaction,
  isCheckinInPast,
  publicGuestSummary,
  withoutPassword,
  canBookTrusteeReservedDates,
} from "./booking-guards";

// Same-day stay must count its own day (trustee lock bypass, 25 Oct incident).
const day = new Date("2026-10-25T00:00:00.000Z");
const walk = (a: Date, b: Date) => {
  const out: string[] = [];
  for (let d = new Date(a); d < lastNightEnd(a, b); d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
};
assert.deepEqual(walk(day, day), ["2026-10-25"]);
assert.deepEqual(walk(day, new Date("2026-10-26T00:00:00.000Z")), ["2026-10-25"]);
assert.deepEqual(walk(day, new Date("2026-10-28T00:00:00.000Z")), ["2026-10-25", "2026-10-26", "2026-10-27"]);

// Forged server-owned fields from a guest request are overwritten.
const forged = applyGuestBookingDefaults({
  guests: 2,
  paymentStatus: "paid_online",
  status: "checked_in",
  roomNumber: "101",
  paymentReference: "pay_fake",
  isAutoBooking: true,
  actualCheckinTime: new Date(),
});
assert.equal(forged.paymentStatus, "unpaid");
assert.equal(forged.status, "confirmed");
assert.equal(forged.roomNumber, null);
assert.equal(forged.paymentReference, null);
assert.equal(forged.isAutoBooking, false);
assert.equal(forged.actualCheckinTime, null);
assert.equal(forged.guests, 2); // legitimate fields untouched

// A settled payment is never downgraded by a late failure.
assert.equal(isSettledTransaction("success"), true);
assert.equal(isSettledTransaction("completed"), true);
assert.equal(isSettledTransaction("failed"), false);
assert.equal(isSettledTransaction("pending"), false);

// Amount must match the order amount.
assert.equal(paidAmountMatches(1300, "1300.00"), true);
assert.equal(paidAmountMatches(1, "1300.00"), false);

// Verify must be tied to the transaction's own order.
assert.equal(orderMatchesTransaction("order_A", "order_A"), true);
assert.equal(orderMatchesTransaction("order_A", "order_B"), false);
assert.equal(orderMatchesTransaction(undefined, "order_B"), false);

// No past check-in dates for guests (IST calendar day).
const nowIst = new Date("2026-10-26T10:00:00+05:30");
assert.equal(isCheckinInPast("2026-10-25T00:00:00.000Z", nowIst), true);
assert.equal(isCheckinInPast("2026-10-26T00:00:00.000Z", nowIst), false);
assert.equal(isCheckinInPast("2026-10-27", nowIst), false);
// 00:30 IST on the 27th is still the 26th in UTC - today in IST must be the 27th.
assert.equal(isCheckinInPast("2026-10-26T00:00:00.000Z", new Date("2026-10-27T00:30:00+05:30")), true);

// Public lookup and booking responses never carry the password hash.
assert.deepEqual(publicGuestSummary({ name: "A", mobile: "9", password: "h" } as any), { name: "A" });
assert.equal(publicGuestSummary(null), null);
assert.equal("password" in withoutPassword({ id: 1, password: "h", mobile: "9" }), false);

// Trustee privilege needs the trustee's own login, not just their mobile number.
assert.equal(canBookTrusteeReservedDates({ id: 7, isTrustee: true }, 7), true);
assert.equal(canBookTrusteeReservedDates({ id: 7, isTrustee: true }, undefined), false);
assert.equal(canBookTrusteeReservedDates({ id: 7, isTrustee: true }, 8), false);
assert.equal(canBookTrusteeReservedDates({ id: 7, isTrustee: false }, 7), false);

console.log("booking-guards: all assertions passed");
