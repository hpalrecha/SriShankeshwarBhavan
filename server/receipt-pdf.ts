import PDFDocument from "pdfkit";
import type { RoomBooking, RoomCategory, User } from "@shared/schema";

const MAROON = "#8b1220";
const MAROON_SOFT = "#c23b4a";
const MAROON_LINE = "#e3b3ba";
const INK = "#1a1414";
const GRAY = "#333333";

const PAGE_W = 595.28; // A4 at 72dpi
const PAGE_H = 841.89;
const OUTER = 28; // page padding, ~10mm
const PAD_X = 32;
const PAD_Y = 24;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" });

const dash = (v?: string | number | null) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s.length > 0 ? s : "—"; // em dash
};

type IconKind = "person" | "pin" | "calendarIn" | "calendarOut" | "people" | "bed" | "coin" | "car" | "doc" | "calendar" | "creditcard" | "idcard";

// Small vector glyphs drawn with primitives so the PDF never depends on an
// icon font/image being embedded - keeps this dependency-free for the
// resource-constrained shared box this runs on.
function drawIcon(doc: PDFKit.PDFDocument, kind: IconKind, cx: number, cy: number, size: number, color = MAROON) {
  const r = size / 2;
  doc.save();
  doc.lineWidth(1.1).strokeColor(color).fillColor(color);

  switch (kind) {
    case "person":
    case "people": {
      const headR = r * 0.4;
      doc.circle(cx, cy - r * 0.35, headR).fill();
      doc
        .moveTo(cx - r * 0.6, cy + r * 0.55)
        .quadraticCurveTo(cx, cy - r * 0.05, cx + r * 0.6, cy + r * 0.55)
        .fill();
      if (kind === "people") {
        const ox = r * 0.75;
        doc.circle(cx + ox, cy - r * 0.25, headR * 0.8).fillOpacity(0.6).fill();
        doc.fillOpacity(1);
      }
      break;
    }
    case "pin": {
      doc
        .moveTo(cx, cy + r)
        .quadraticCurveTo(cx - r, cy, cx, cy - r)
        .quadraticCurveTo(cx + r, cy, cx, cy + r)
        .fill();
      doc.circle(cx, cy - r * 0.15, r * 0.32).fillColor("#ffffff").fill();
      break;
    }
    case "calendar":
    case "calendarIn":
    case "calendarOut": {
      doc.roundedRect(cx - r, cy - r * 0.7, size, size * 0.8, 1.5).stroke();
      doc.moveTo(cx - r, cy - r * 0.25).lineTo(cx + r, cy - r * 0.25).stroke();
      doc.moveTo(cx - r * 0.5, cy - r).lineTo(cx - r * 0.5, cy - r * 0.5).stroke();
      doc.moveTo(cx + r * 0.5, cy - r).lineTo(cx + r * 0.5, cy - r * 0.5).stroke();
      if (kind === "calendarIn") {
        doc
          .moveTo(cx - r * 0.35, cy + r * 0.05)
          .lineTo(cx - r * 0.05, cy + r * 0.35)
          .lineTo(cx + r * 0.45, cy - r * 0.2)
          .stroke();
      } else if (kind === "calendarOut") {
        doc.moveTo(cx - r * 0.35, cy + r * 0.15).lineTo(cx + r * 0.35, cy + r * 0.15).stroke();
        doc
          .moveTo(cx + r * 0.1, cy - r * 0.15)
          .lineTo(cx + r * 0.35, cy + r * 0.15)
          .lineTo(cx + r * 0.1, cy + r * 0.45)
          .stroke();
      }
      break;
    }
    case "bed": {
      doc.roundedRect(cx - r, cy - r * 0.2, size, size * 0.6, 1.5).stroke();
      doc.moveTo(cx - r, cy - r * 0.2).lineTo(cx - r, cy - r * 0.7).stroke();
      doc.roundedRect(cx - r * 0.85, cy - r * 0.55, size * 0.4, size * 0.3, 1).stroke();
      doc.moveTo(cx - r, cy + r * 0.15).lineTo(cx + r, cy + r * 0.15).stroke();
      break;
    }
    case "coin": {
      // Vector rupee mark - the standard PDF fonts have no ₹ glyph, so this
      // is drawn from strokes rather than text.
      doc.circle(cx, cy, r * 0.9).stroke();
      doc.lineWidth(0.9);
      doc.moveTo(cx - r * 0.32, cy - r * 0.4).lineTo(cx + r * 0.35, cy - r * 0.4).stroke();
      doc.moveTo(cx - r * 0.32, cy - r * 0.12).lineTo(cx + r * 0.35, cy - r * 0.12).stroke();
      doc.moveTo(cx - r * 0.32, cy - r * 0.4).lineTo(cx + r * 0.05, cy - r * 0.12).stroke();
      doc.moveTo(cx - r * 0.05, cy - r * 0.12).lineTo(cx + r * 0.3, cy + r * 0.42).stroke();
      break;
    }
    case "car": {
      doc.roundedRect(cx - r, cy - r * 0.1, size, size * 0.45, 2).stroke();
      doc
        .moveTo(cx - r * 0.6, cy - r * 0.1)
        .lineTo(cx - r * 0.3, cy - r * 0.55)
        .lineTo(cx + r * 0.3, cy - r * 0.55)
        .lineTo(cx + r * 0.6, cy - r * 0.1)
        .stroke();
      doc.circle(cx - r * 0.5, cy + r * 0.4, r * 0.22).fill();
      doc.circle(cx + r * 0.5, cy + r * 0.4, r * 0.22).fill();
      break;
    }
    case "doc": {
      doc.roundedRect(cx - r * 0.7, cy - r, size * 0.7, size, 1.5).stroke();
      doc.moveTo(cx - r * 0.4, cy - r * 0.4).lineTo(cx + r * 0.4, cy - r * 0.4).stroke();
      doc.moveTo(cx - r * 0.4, cy).lineTo(cx + r * 0.4, cy).stroke();
      doc.moveTo(cx - r * 0.4, cy + r * 0.4).lineTo(cx + r * 0.1, cy + r * 0.4).stroke();
      break;
    }
    case "creditcard": {
      doc.roundedRect(cx - r, cy - r * 0.65, size, size * 0.65, 1.5).stroke();
      doc.moveTo(cx - r, cy - r * 0.2).lineTo(cx + r, cy - r * 0.2).stroke();
      doc.rect(cx - r * 0.7, cy + r * 0.05, r * 0.6, r * 0.18).fill();
      break;
    }
    case "idcard": {
      doc.roundedRect(cx - r, cy - r * 0.7, size, size * 0.8, 1.5).stroke();
      doc.circle(cx - r * 0.55, cy - r * 0.1, r * 0.22).stroke();
      doc.moveTo(cx - r * 0.15, cy - r * 0.2).lineTo(cx + r * 0.55, cy - r * 0.2).stroke();
      doc.moveTo(cx - r * 0.15, cy + r * 0.02).lineTo(cx + r * 0.55, cy + r * 0.02).stroke();
      break;
    }
  }
  doc.restore();
}

function decorativeDivider(doc: PDFKit.PDFDocument, y: number, contentX: number, contentW: number) {
  const cx = contentX + contentW / 2;
  const lineW = 90;
  doc.save().strokeColor(MAROON_LINE).lineWidth(1);
  doc.moveTo(cx - lineW - 10, y).lineTo(cx - 10, y).stroke();
  doc.moveTo(cx + 10, y).lineTo(cx + lineW + 10, y).stroke();
  doc.fillColor(MAROON_SOFT);
  doc.circle(cx - 5, y, 1.4).fill();
  doc.circle(cx + 5, y, 1.4).fill();
  doc.fillColor(MAROON);
  doc.circle(cx, y, 2.2).fill();
  doc.restore();
}

interface ReceiptData {
  booking: RoomBooking;
  user: User | null;
  category: RoomCategory;
  guestName?: string;
}

// Renders the same design as the on-site printable receipt
// (client/src/components/admin/booking-receipt.tsx) as a standalone PDF, so
// it can be attached to the confirmation email - that component is a React
// tree meant for the browser's print engine and can't run on the server.
export function generateReceiptPdfBuffer(data: ReceiptData): Promise<Buffer> {
  const { booking: b, user, category, guestName: guestNameOverride } = data;
  const guestName = guestNameOverride || b.primaryGuestName || user?.name || "";
  const checkin = new Date(b.checkinDate);
  const checkout = new Date(b.checkoutDate);
  const today = new Date();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const borderX = OUTER;
    const borderY = OUTER;
    const borderW = PAGE_W - OUTER * 2;
    const borderH = PAGE_H - OUTER * 2;
    const contentX = borderX + PAD_X;
    const contentW = borderW - PAD_X * 2;

    // Outer border (double-line effect) + corner accents
    doc.roundedRect(borderX, borderY, borderW, borderH, 10).lineWidth(1.5).strokeColor(MAROON).stroke();
    doc.roundedRect(borderX - 3, borderY - 3, borderW + 6, borderH + 6, 12).lineWidth(0.75).strokeColor(MAROON).stroke();
    const cornerLen = 18;
    doc.lineWidth(2).strokeColor(MAROON);
    [
      [borderX - 6, borderY - 6, 1, 1],
      [borderX + borderW + 6, borderY - 6, -1, 1],
      [borderX - 6, borderY + borderH + 6, 1, -1],
      [borderX + borderW + 6, borderY + borderH + 6, -1, -1],
    ].forEach(([x, y, dx, dy]) => {
      doc.moveTo(x, y + cornerLen * dy).lineTo(x, y).lineTo(x + cornerLen * dx, y).stroke();
    });

    let y = borderY + PAD_Y;

    // Header
    decorativeDivider(doc, y + 4, contentX, contentW);
    y += 20;

    doc
      .font("Times-Bold")
      .fontSize(23)
      .fillColor(MAROON)
      .text("Shri Shankeshwar Bengaluru Bhavan", contentX, y, { width: contentW, align: "center" });
    y += 30;

    doc
      .font("Times-Roman")
      .fontSize(11)
      .fillColor(GRAY)
      .text("Managed by Shri Shankeshwar Parshwanath Trust", contentX, y, { width: contentW, align: "center" });
    y += 15;
    doc.text("Near Shankeshwar Parshwanath Temple, Main Market, Shankheshwar (Patan), Gujarat", contentX, y, {
      width: contentW,
      align: "center",
    });
    y += 15;
    doc.text("Phone: 9727070766, 9727070765", contentX, y, { width: contentW, align: "center" });
    y += 18;

    decorativeDivider(doc, y, contentX, contentW);
    y += 20;

    // Receipt No / Date row
    const metaIconSize = 11;
    drawIcon(doc, "doc", contentX + metaIconSize / 2, y + 5, metaIconSize);
    doc
      .font("Times-Roman")
      .fontSize(12)
      .fillColor(INK)
      .text("Receipt No: ", contentX + metaIconSize + 6, y, { continued: true })
      .font("Times-Bold")
      .text(b.bookingId, { continued: false });

    const dateLabel = `Date: ${fmtDate(today)}`;
    doc.font("Times-Bold").fontSize(12);
    const dateIconX = contentX + contentW - doc.widthOfString(dateLabel) - 18;
    drawIcon(doc, "calendar", dateIconX + metaIconSize / 2, y + 5, metaIconSize);
    doc
      .font("Times-Roman")
      .fontSize(12)
      .text("Date: ", dateIconX + metaIconSize + 6, y, { continued: true })
      .font("Times-Bold")
      .text(fmtDate(today), { continued: false });
    y += 26;

    // Details box
    const isOnlinePayment = b.paymentMethod === "pay_online";
    // Online payment already collected food/extra-bed charges too, so the
    // receipt shows what was actually charged (the full total); cash/pay-at-
    // checkin still owes food etc. separately, so it shows just the room cost.
    const roomAmount = parseFloat(b.totalAmount || "0") - parseFloat(b.foodAmount || "0") - parseFloat(b.extraBedAmount || "0");
    const rentRow: { icon: IconKind; label: string; value: string } = isOnlinePayment
      ? { icon: "coin", label: "Total Amount", value: `Rs. ${parseFloat(b.totalAmount || "0").toFixed(2)}` }
      : { icon: "coin", label: "Room Rent", value: `Rs. ${roomAmount.toFixed(2)}` };

    const rows: Array<{ icon: IconKind; label: string; value: string; blank?: boolean }> = [
      { icon: "person", label: "Guest Full Name", value: dash(guestName) },
      { icon: "idcard", label: "Aadhaar Number", value: dash(b.aadhaarNumber) },
      { icon: "pin", label: "City", value: dash(b.city) },
      { icon: "calendarIn", label: "Arrival Date", value: fmtDate(checkin) },
      { icon: "calendarOut", label: "Departure Date", value: fmtDate(checkout) },
      { icon: "people", label: "Male / Female / Children", value: "—" },
      { icon: "person", label: "Total Guests", value: dash(b.guests) },
      { icon: "bed", label: "Room No.", value: b.roomNumber || "", blank: !b.roomNumber },
      { icon: "creditcard", label: "Payment Mode", value: isOnlinePayment ? "Online" : "Cash" },
      rentRow,
      { icon: "car", label: "Vehicle No.", value: "—" },
    ];

    const rowH = 34;
    const boxY = y;
    const boxH = rowH * rows.length + 8;
    doc.roundedRect(contentX, boxY, contentW, boxH, 8).lineWidth(1).strokeColor(MAROON_LINE).stroke();

    const iconColX = contentX + 16;
    const labelColX = contentX + 34;
    const colonColX = contentX + 34 + 172;
    const valueColX = colonColX + 14;
    let rowY = boxY + 4;

    rows.forEach((row, i) => {
      const midY = rowY + rowH / 2;
      drawIcon(doc, row.icon, iconColX, midY, 13);
      doc.font("Times-Bold").fontSize(11.5).fillColor(INK).text(row.label, labelColX, midY - 6, { lineBreak: false });
      doc.font("Times-Roman").fontSize(11.5).fillColor("#666666").text(":", colonColX, midY - 6, { lineBreak: false });
      if (row.blank) {
        doc.moveTo(valueColX, midY + 4).lineTo(valueColX + 46, midY + 4).lineWidth(1).strokeColor(INK).stroke();
      } else {
        doc.font("Times-Roman").fontSize(11.5).fillColor(INK).text(row.value, valueColX, midY - 6, { lineBreak: false });
      }
      if (i < rows.length - 1) {
        doc
          .save()
          .dash(1.5, { space: 1.5 })
          .moveTo(contentX + 10, rowY + rowH)
          .lineTo(contentX + contentW - 10, rowY + rowH)
          .lineWidth(0.75)
          .strokeColor(MAROON_LINE)
          .stroke()
          .undash()
          .restore();
      }
      rowY += rowH;
    });

    y = boxY + boxH + 18;

    // Footer
    decorativeDivider(doc, y, contentX, contentW);
    y += 40;

    const signW = 150;
    doc.lineWidth(1).strokeColor(INK);
    doc.moveTo(contentX + 20, y).lineTo(contentX + 20 + signW, y).stroke();
    doc
      .moveTo(contentX + contentW - 20 - signW, y)
      .lineTo(contentX + contentW - 20, y)
      .stroke();
    doc
      .font("Times-Roman")
      .fontSize(10.5)
      .fillColor(INK)
      .text("Guest Signature", contentX + 20, y + 6, { width: signW, align: "center" });
    doc.text("Authorized Signature", contentX + contentW - 20 - signW, y + 6, { width: signW, align: "center" });

    doc.end();
  });
}
