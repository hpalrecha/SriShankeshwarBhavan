export interface BookingDateValidationInput {
  checkinDate: string | Date;
  checkoutDate: string | Date;
  checkinTime?: string | Date | null;
  checkoutTime?: string | Date | null;
}

export interface BookingDateValidationResult {
  valid: boolean;
  message?: string;
}

export function validateBookingDates({
  checkinDate,
  checkoutDate,
  checkinTime,
  checkoutTime,
}: BookingDateValidationInput): BookingDateValidationResult {
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);

  if (checkout < checkin) {
    return { valid: false, message: "Check-out date cannot be before the check-in date." };
  }

  if (
    checkout.getTime() === checkin.getTime() &&
    checkinTime &&
    checkoutTime &&
    new Date(checkoutTime) <= new Date(checkinTime)
  ) {
    return {
      valid: false,
      message: "For a same-day stay, check-out time must be after check-in time.",
    };
  }

  return { valid: true };
}

const BOOKING_DATE_FIELDS = ["checkinDate", "checkoutDate", "estimatedArrivalTime", "estimatedDepartureTime"] as const;

// Validates a partial admin update against the booking's current values. Skips
// the check entirely when the update touches none of the date/time fields, so
// unrelated edits (status, payment, ID proofs) never trip on legacy rows.
export function validateBookingUpdate(
  original: Record<string, any>,
  updates: Record<string, any>,
): BookingDateValidationResult {
  if (!BOOKING_DATE_FIELDS.some((field) => field in updates)) {
    return { valid: true };
  }
  const value = (field: (typeof BOOKING_DATE_FIELDS)[number]) =>
    field in updates ? updates[field] : original[field];
  return validateBookingDates({
    checkinDate: value("checkinDate"),
    checkoutDate: value("checkoutDate"),
    checkinTime: value("estimatedArrivalTime"),
    checkoutTime: value("estimatedDepartureTime"),
  });
}
