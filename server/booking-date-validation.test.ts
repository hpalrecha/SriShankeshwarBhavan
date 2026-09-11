import assert from "node:assert/strict";
import { validateBookingDates } from "./booking-date-validation";

const checkin = "2026-09-11";

assert.equal(validateBookingDates({ checkinDate: checkin, checkoutDate: checkin }).valid, true);
assert.equal(validateBookingDates({ checkinDate: checkin, checkoutDate: "2026-09-12" }).valid, true);
assert.equal(validateBookingDates({ checkinDate: checkin, checkoutDate: "2026-09-10" }).valid, false);
assert.equal(validateBookingDates({
  checkinDate: checkin,
  checkoutDate: checkin,
  checkinTime: "2026-09-11T10:00",
  checkoutTime: "2026-09-11T18:00",
}).valid, true);
assert.equal(validateBookingDates({
  checkinDate: checkin,
  checkoutDate: checkin,
  checkinTime: "2026-09-11T10:00",
  checkoutTime: "2026-09-11T10:00",
}).valid, false);
assert.equal(validateBookingDates({
  checkinDate: checkin,
  checkoutDate: checkin,
  checkinTime: "2026-09-11T10:00",
  checkoutTime: "2026-09-11T09:00",
}).valid, false);

console.log("booking date validation tests passed");
