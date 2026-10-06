import assert from "node:assert/strict";
import { validateBookingDates, validateBookingUpdate } from "./booking-date-validation";

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

const original = {
  checkinDate: new Date("2026-09-11T00:00:00Z"),
  checkoutDate: new Date("2026-09-12T00:00:00Z"),
  estimatedArrivalTime: new Date("2026-09-11T10:00:00Z"),
  estimatedDepartureTime: new Date("2026-09-12T10:00:00Z"),
};

assert.equal(validateBookingUpdate(original, { status: "checked_in" }).valid, true);
assert.equal(validateBookingUpdate(original, { paymentStatus: "paid_online" }).valid, true);
assert.equal(validateBookingUpdate(original, { checkoutDate: new Date("2026-09-14T00:00:00Z") }).valid, true);
assert.equal(validateBookingUpdate(original, { checkoutDate: new Date("2026-09-10T00:00:00Z") }).valid, false);
assert.equal(validateBookingUpdate(original, { checkinDate: new Date("2026-09-13T00:00:00Z") }).valid, false);
assert.equal(validateBookingUpdate(original, { estimatedDepartureTime: new Date("2026-09-11T09:00:00Z") }).valid, true);
assert.equal(validateBookingUpdate(
  { ...original, checkinDate: new Date("2026-09-11T00:00:00Z"), checkoutDate: new Date("2026-09-11T00:00:00Z") },
  { estimatedDepartureTime: new Date("2026-09-11T09:00:00Z") },
).valid, false);
assert.equal(validateBookingUpdate(
  { ...original, checkinDate: new Date("2026-09-11T00:00:00Z"), checkoutDate: new Date("2026-09-11T00:00:00Z") },
  { estimatedDepartureTime: new Date("2026-09-11T18:00:00Z") },
).valid, true);

console.log("booking date validation tests passed");
