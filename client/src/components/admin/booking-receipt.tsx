import type { BookingWithDetails } from "@/lib/types";

interface BookingReceiptProps {
  booking: BookingWithDetails;
}

// Printable stay receipt, English translation of the trust's paper voucher
// (name, arrival/departure, city, guest breakdown, room, rent, vehicle,
// signature). Rendered off-screen at all times; only visible to the browser's
// print engine via the @media print rule in index.css. Two fields on the
// paper form - male/female/children breakdown and vehicle number - aren't
// captured anywhere in this app's booking data, so they print as blank
// write-in lines, same as front desk already fills by hand today.
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
  const fmtTime = (d: Date | null) =>
    d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";

  const guestName = b.primaryGuestName || booking.user.name;
  const city = b.city || "";
  const arrivalTime = b.estimatedArrivalTime ? fmtTime(new Date(b.estimatedArrivalTime)) : (b.eta || "");
  const departureTime = b.estimatedDepartureTime ? fmtTime(new Date(b.estimatedDepartureTime)) : (b.etd || "");

  return (
    <div id="booking-receipt-print">
      <div className="receipt-header">
        <h1>Shri Shankeshwar Bengaluru Bhavan</h1>
        <p className="receipt-subtitle">Managed by Shri Shankeshwar Parshwanath Trust</p>
        <p className="receipt-address">
          Near Shankeshwar Parshwanath Temple, Main Market, Shankheshwar (Patan), Gujarat
        </p>
        <p className="receipt-phone">Phone: 9727070766, 9727070765</p>
      </div>

      <div className="receipt-meta">
        <span>Receipt No: {b.bookingId}</span>
        <span>Date: {fmtDate(today)}</span>
      </div>

      <hr />

      <table className="receipt-fields">
        <tbody>
          <tr>
            <td className="label">Guest Full Name</td>
            <td className="value">{guestName}</td>
          </tr>
          <tr>
            <td className="label">City</td>
            <td className="value">{city}</td>
          </tr>
          <tr>
            <td className="label">Arrival Date</td>
            <td className="value">{fmtDate(checkin)}{arrivalTime ? `, Time: ${arrivalTime}` : ""}</td>
          </tr>
          <tr>
            <td className="label">Departure Date</td>
            <td className="value">{fmtDate(checkout)}{departureTime ? `, Time: ${departureTime}` : ""}</td>
          </tr>
          <tr>
            <td className="label">Male / Female / Children</td>
            <td className="value blank-line">&nbsp;</td>
          </tr>
          <tr>
            <td className="label">Total Guests</td>
            <td className="value">{b.guests}</td>
          </tr>
          <tr>
            <td className="label">Room No.</td>
            <td className="value">{b.roomNumber || "___"}</td>
          </tr>
          <tr>
            <td className="label">Room Rent</td>
            <td className="value">Rs. {b.totalAmount}</td>
          </tr>
          <tr>
            <td className="label">Vehicle No.</td>
            <td className="value blank-line">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div className="receipt-signature">
        <span>Signature of Guest</span>
        <span className="sign-line"></span>
      </div>
    </div>
  );
}

