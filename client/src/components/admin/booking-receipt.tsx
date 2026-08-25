import type { ReactNode } from "react";
import { FileText, CalendarDays, User, MapPin, CalendarCheck2, CalendarX2, Users, BedDouble, IndianRupee, Car, CreditCard, IdCard } from "lucide-react";
import type { BookingWithDetails } from "@/lib/types";

interface BookingReceiptProps {
  booking: BookingWithDetails;
}

// Shows "-" for a field the trust doesn't collect (city, gender breakdown,
// vehicle no.) rather than an empty/undefined cell - matches the reference
// paper voucher, which front desk fills by hand for these when relevant.
const dash = (v?: string | number | null) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s.length > 0 ? s : "—";
};

// Printable stay receipt, English translation of the trust's paper voucher
// (name, arrival/departure, city, guest breakdown, room, rent, vehicle,
// signature). Rendered off-screen at all times; only visible to the browser's
// print engine via the @media print rule in index.css. Two fields on the
// paper form - male/female/children breakdown and vehicle number - aren't
// captured anywhere in this app's booking data, so they always print as "-",
// same as front desk already fills in by hand today.
export default function BookingReceipt({ booking }: BookingReceiptProps) {
  const b = booking.booking;
  const checkin = new Date(b.checkinDate);
  const checkout = new Date(b.checkoutDate);
  const today = new Date();

  // Pinned to Asia/Kolkata explicitly - without it, these render using
  // whichever timezone the viewing browser (or, for the checkin/checkout
  // dates, a server-rendered PDF) happens to be set to, silently shifting
  // the date or time shown depending on who's looking. Same bug class as
  // the raw-storage timezone issue fixed earlier in room_bookings.
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const fmtDateTime = (d: Date) => `${fmtDate(d)}, ${fmtTime(d)}`;

  const guestName = b.primaryGuestName || booking.user.name;
  const isOnlinePayment = b.paymentMethod === "pay_online";

  // Prefer the actual recorded check-in/check-out moment (set when front
  // desk marks the guest in/out) - its own date+time, not just the planned
  // checkinDate, since a guest can genuinely arrive a different day/time
  // than booked. Falls back to the estimated time from booking, then to
  // just the plain date if no time is known at all yet.
  const checkinMoment = b.actualCheckinTime || b.estimatedArrivalTime;
  const checkoutMoment = b.actualCheckoutTime || b.estimatedDepartureTime;
  const checkinValue = checkinMoment ? fmtDateTime(new Date(checkinMoment)) : fmtDate(checkin);
  const checkoutValue = checkoutMoment ? fmtDateTime(new Date(checkoutMoment)) : fmtDate(checkout);

  // Online payment already collected food/extra-bed charges too, so the
  // receipt shows what was actually charged (the full total); cash/pay-at-
  // checkin still owes food etc. separately, so it shows just the room cost.
  const roomAmount = parseFloat(b.totalAmount || "0") - parseFloat(b.foodAmount || "0") - parseFloat(b.extraBedAmount || "0");
  const rentRow = isOnlinePayment
    ? { icon: <IndianRupee />, label: "Total Amount", value: `Rs. ${parseFloat(b.totalAmount || "0").toFixed(2)}` }
    : { icon: <IndianRupee />, label: "Room Rent", value: `Rs. ${roomAmount.toFixed(2)}` };

  const rows: Array<{ icon: ReactNode; label: string; value: ReactNode; blank?: boolean }> = [
    { icon: <User />, label: "Guest Full Name", value: dash(guestName) },
    { icon: <IdCard />, label: "Aadhaar Number", value: dash(b.aadhaarNumber) },
    { icon: <MapPin />, label: "City", value: dash(b.city) },
    { icon: <CalendarCheck2 />, label: "Check-in", value: checkinValue },
    { icon: <CalendarX2 />, label: "Check-out", value: checkoutValue },
    { icon: <Users />, label: "Male / Female / Children", value: "—" },
    { icon: <User />, label: "Total Guests", value: dash(b.guests) },
    { icon: <BedDouble />, label: "Room No.", value: b.roomNumber ? b.roomNumber : "", blank: !b.roomNumber },
    { icon: <CreditCard />, label: "Payment Mode", value: isOnlinePayment ? "Online" : "Cash" },
    rentRow,
    { icon: <Car />, label: "Vehicle No.", value: "—" },
  ];

  return (
    <div id="booking-receipt-print">
      <div className="receipt-page">
        <div className="receipt-border">
          <span className="receipt-corner corner-tl" />
          <span className="receipt-corner corner-tr" />
          <span className="receipt-corner corner-bl" />
          <span className="receipt-corner corner-br" />

          <div className="receipt-header">
            <div className="receipt-emblem-row">
              <span className="emblem-line" />
              <span className="emblem-dot" />
              <svg className="receipt-emblem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2c1.8 2 2.6 4 2.6 5.8 0 1.4-.8 2.4-1.6 3.1 1.9.2 3.5 1.1 4.6 2.5.9 1.1 1.4 2.5 1.4 3.9h-2.2c0-1-.4-2-1.1-2.8-.9-1-2.1-1.5-3.7-1.5-1.6 0-2.8.5-3.7 1.5-.7.8-1.1 1.8-1.1 2.8H5c0-1.4.5-2.8 1.4-3.9 1.1-1.4 2.7-2.3 4.6-2.5-.8-.7-1.6-1.7-1.6-3.1C9.4 6 10.2 4 12 2z"
                  fill="currentColor"
                />
                <circle cx="12" cy="20.4" r="1.1" fill="currentColor" />
              </svg>
              <span className="emblem-dot" />
              <span className="emblem-line" />
            </div>

            <h1>Shri Shankeshwar Bengaluru Bhavan</h1>
            <p className="receipt-subtitle">Managed by Shri Shankeshwar Parshwanath Trust</p>
            <p className="receipt-address">
              Near Shankeshwar Parshwanath Temple, Main Market, Shankheshwar (Patan), Gujarat
            </p>
            <p className="receipt-phone">Phone: 9727070766, 9727070765</p>

            <div className="receipt-divider">
              <span className="divider-line" />
              <span className="divider-dot" />
              <span className="divider-dot large" />
              <span className="divider-dot" />
              <span className="divider-line" />
            </div>
          </div>

          <div className="receipt-meta">
            <span className="meta-item">
              <FileText className="meta-icon" />
              <span>Receipt No: <b>{b.bookingId}</b></span>
            </span>
            <span className="meta-item">
              <CalendarDays className="meta-icon" />
              <span>Date: <b>{fmtDate(today)}</b></span>
            </span>
          </div>

          <div className="receipt-details">
            {rows.map((row, i) => (
              <div className="detail-row" key={row.label}>
                <span className="detail-icon">{row.icon}</span>
                <span className="detail-label">{row.label}</span>
                <span className="detail-colon">:</span>
                {row.blank ? (
                  <span className="detail-value"><span className="value-blank" /></span>
                ) : (
                  <span className="detail-value">{row.value}</span>
                )}
              </div>
            ))}
          </div>

          <div className="receipt-divider footer-divider">
            <span className="divider-line" />
            <span className="divider-dot" />
            <span className="divider-dot large" />
            <span className="divider-dot" />
            <span className="divider-line" />
          </div>

          <div className="receipt-signature">
            <div className="sign-block">
              <span className="sign-line" />
              <span className="sign-label">Guest Signature</span>
            </div>
            <div className="sign-block">
              <span className="sign-line" />
              <span className="sign-label">Authorized Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
