import { sendBookingConfirmationEmail, sendBookingCancellationEmail, sendPasswordResetEmail, sendPreCheckinReminderEmail, sendCheckinDayWelcomeEmail, sendPostCheckoutFeedbackEmail } from "./email";
import type { RoomBooking, User, RoomCategory } from "@shared/schema";

export async function testAllEmailTemplates(recipientEmail: string): Promise<void> {
  console.log(`=== TESTING ALL EMAIL TEMPLATES FOR: ${recipientEmail} ===`);

  // Mock data for testing
  const mockUser: User = {
    id: "test-user-123",
    email: recipientEmail,
    name: "Jaggi Test User",
    firstName: "Jaggi",
    lastName: "Test",
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: null,
    resetToken: null,
    resetTokenExpiry: null
  };

  const mockCategory: RoomCategory = {
    id: 1,
    name: "Deluxe Room",
    description: "Spacious deluxe room with modern amenities",
    pricePerNight: "2500",
    maxGuests: 4,
    amenities: ["Air Conditioning", "Wi-Fi", "TV", "Room Service"],
    isActive: true,
    roomCount: 10,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBooking: RoomBooking = {
    id: 1,
    bookingId: "SSBB-TEST-2025-001",
    userId: 1,
    roomCategoryId: 1,
    checkinDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    checkoutDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
    guests: 2,
    totalAmount: "5000",
    paymentStatus: "confirmed",
    paymentMethod: "upi",
    paymentReference: "UPI123456789",
    status: "confirmed",
    name: "Jaggi Test User",
    email: recipientEmail,
    phone: "+91 9876543210",
    address: "Test Address, Test City",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001",
    arrivingFrom: "Mumbai Airport",
    goingTo: "Parshwanath Temple",
    eta: "2:00 PM",
    etd: "11:00 AM",
    idProofType: "aadhaar",
    idProofNumber: "1234 5678 9012",
    idProofImageUrl: null,
    hasBreakfast: true,
    hasLunch: false,
    hasDinner: true,
    foodAmount: "400",
    actualCheckinTime: null,
    actualCheckoutTime: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    console.log("\n1. Sending Booking Confirmation Email...");
    const confirmationSent = await sendBookingConfirmationEmail({
      booking: mockBooking,
      user: mockUser,
      category: mockCategory,
      guestName: mockUser.name!,
      guestEmail: mockUser.email!
    });
    console.log(`✅ Booking Confirmation: ${confirmationSent ? 'Sent' : 'Failed'}`);

    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n2. Sending Booking Cancellation Email...");
    const cancellationSent = await sendBookingCancellationEmail({
      booking: { ...mockBooking, status: "cancelled" },
      user: mockUser,
      category: mockCategory,
      guestName: mockUser.name!,
      guestEmail: mockUser.email!
    });
    console.log(`✅ Booking Cancellation: ${cancellationSent ? 'Sent' : 'Failed'}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n3. Sending Password Reset Email...");
    const resetSent = await sendPasswordResetEmail(
      mockUser.email!,
      "test-reset-token-123456"
    );
    console.log(`✅ Password Reset: ${resetSent ? 'Sent' : 'Failed'}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n4. Sending Pre Check-in Reminder Email...");
    const preCheckinSent = await sendPreCheckinReminderEmail(mockBooking, mockUser, mockCategory);
    console.log(`✅ Pre Check-in Reminder: ${preCheckinSent ? 'Sent' : 'Failed'}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n5. Sending Check-in Day Welcome Email...");
    const checkinDaySent = await sendCheckinDayWelcomeEmail(mockBooking, mockUser, mockCategory);
    console.log(`✅ Check-in Day Welcome: ${checkinDaySent ? 'Sent' : 'Failed'}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n6. Sending Post Checkout Feedback Email...");
    const feedbackSent = await sendPostCheckoutFeedbackEmail(
      { 
        ...mockBooking, 
        actualCheckinTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        actualCheckoutTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: "completed"
      },
      mockUser,
      mockCategory
    );
    console.log(`✅ Post Checkout Feedback: ${feedbackSent ? 'Sent' : 'Failed'}`);

    console.log("\n=== ALL EMAIL TEMPLATES SENT SUCCESSFULLY ===");
    console.log(`📧 Check your inbox at: ${recipientEmail}`);
    console.log("You should have received 6 different email templates:");
    console.log("1. Booking Confirmation");
    console.log("2. Booking Cancellation");
    console.log("3. Password Reset");
    console.log("4. Pre Check-in Reminder (1 day before)");
    console.log("5. Check-in Day Welcome");
    console.log("6. Post Checkout Feedback Request");

  } catch (error: any) {
    console.error("❌ Error sending email templates:", error.message);
  }
}