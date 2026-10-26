// Pure guard logic for the booking/payment safety fixes, kept separate from
// routes.ts so each rule has a regression test (booking-guards.test.ts) and
// can't silently break again.

const DAY_MS = 24 * 60 * 60 * 1000;

// End bound for walking a stay's nights. A same-day stay (checkin == checkout)
// is billed as 1 night everywhere else (Math.max(1, ...)), so it must count its
// day when checking trustee-reserved dates - otherwise the walk covers zero
// nights and a non-trustee can book a locked date.
export function lastNightEnd(checkin: Date, checkout: Date): Date {
  return checkout > checkin ? checkout : new Date(checkin.getTime() + DAY_MS);
}

// Fields only the server/staff may set on a guest-created booking. The public
// booking form never sends them; whatever a request body says is overwritten,
// so a guest can't create a booking that is already "paid" or "checked in".
export const GUEST_BOOKING_SERVER_FIELDS = {
  status: "confirmed",
  paymentStatus: "unpaid",
  paymentReference: null,
  roomNumber: null,
  isAutoBooking: false,
  actualCheckinTime: null,
  actualCheckoutTime: null,
} as const;

export function applyGuestBookingDefaults<T extends object>(input: T) {
  return { ...input, ...GUEST_BOOKING_SERVER_FIELDS };
}

// Transaction statuses that mean the money is already recorded as received.
export const SETTLED_TRANSACTION_STATUSES = ["success", "completed"];

export function isSettledTransaction(status: string): boolean {
  return SETTLED_TRANSACTION_STATUSES.includes(status);
}

// Paid amount (rupees) must equal the amount the order was created for.
export function paidAmountMatches(paidRupees: number, expected: string | number): boolean {
  return Math.abs(paidRupees - parseFloat(String(expected))) <= 0.01;
}

// A signed Razorpay payment must belong to this transaction's own order.
export function orderMatchesTransaction(paymentOrderId: unknown, transactionOrderId: string | null | undefined): boolean {
  return !transactionOrderId || paymentOrderId === transactionOrderId;
}

// Guest bookings can't start before today (Asia/Kolkata). Stay dates are
// stored as UTC-midnight of the chosen calendar day, so compare calendar
// days, not instants. Staff booking routes are exempt (they may backdate).
export function isCheckinInPast(checkinDate: string | Date, now: Date = new Date()): boolean {
  const checkinDay = new Date(checkinDate).toISOString().slice(0, 10);
  const todayIst = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return checkinDay < todayIst;
}

// Public booking lookup must never expose the account record (password hash,
// contact details, address) - only what the page needs to greet the guest.
export function publicGuestSummary(user: { name?: string | null } | null | undefined) {
  return user ? { name: user.name ?? null } : null;
}

// For responses that return the booking owner to the caller: same user row,
// minus the password hash.
export function withoutPassword<T extends { password?: unknown }>(user: T): Omit<T, "password"> {
  const { password: _password, ...rest } = user;
  return rest;
}

// Trustee-reserved dates: the booking form looks accounts up by mobile number
// alone, so a stored isTrustee flag on the matched account isn't proof the
// caller is that trustee - anyone can type a trustee's number. The privilege
// applies only when the request's own login session belongs to that account.
export function canBookTrusteeReservedDates(
  user: { id: number; isTrustee?: boolean | null },
  sessionUserId: number | undefined | null,
): boolean {
  return !!user.isTrustee && sessionUserId === user.id;
}
