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
