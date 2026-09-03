import cron from "node-cron";
import { storage } from "./storage";
import { sendPreCheckinReminderEmail, sendCheckinDayWelcomeEmail, sendPostCheckoutFeedbackEmail } from "./email";
import { whatsappService } from "./whatsapp";
import { findUnmatchedRazorpayPayments } from "./payment-reconciliation";

// Send pre-checkin reminders at 10:00 AM daily for tomorrow's check-ins
export function startPreCheckinReminderTask() {
  cron.schedule("0 10 * * *", async () => {
    console.log("Running pre-checkin reminder task...");
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      // Get bookings checking in tomorrow
      const bookings = await storage.getBookingsByDateRange(tomorrow, dayAfterTomorrow);
      const tomorrowCheckins = bookings.filter(booking => 
        booking.status === "confirmed" && 
        new Date(booking.checkinDate).toDateString() === tomorrow.toDateString()
      );
      
      console.log(`Found ${tomorrowCheckins.length} check-ins for tomorrow`);
      
      for (const booking of tomorrowCheckins) {
        try {
          const user = booking.userId ? await storage.getUser(booking.userId) : null;
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          
          if (category) {
            // Send email notification
            await sendPreCheckinReminderEmail(booking, user || null, category);
            
            // Send WhatsApp notification
            try {
              await whatsappService.sendPreCheckinReminder(booking, user || null, category);
            } catch (whatsappError) {
              console.error(`WhatsApp pre-checkin reminder failed for ${booking.bookingId}:`, whatsappError);
            }
          }
        } catch (error) {
          console.error(`Error sending pre-checkin reminder for booking ${booking.bookingId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in pre-checkin reminder task:", error);
    }
  });
  
  console.log("Pre-checkin reminder task scheduled for 10:00 AM daily");
}

// Send checkout reminders at 9:00 AM daily for today's check-outs
export function startCheckoutReminderTask() {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running checkout reminder task...");
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get bookings checking out today
      const bookings = await storage.getBookingsByDateRange(today, tomorrow);
      const todayCheckouts = bookings.filter(booking => 
        booking.status === "checked_in" && 
        new Date(booking.checkoutDate).toDateString() === today.toDateString()
      );
      
      console.log(`Found ${todayCheckouts.length} check-outs for today`);
      
      for (const booking of todayCheckouts) {
        try {
          const user = booking.userId ? await storage.getUser(booking.userId) : null;
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          
          if (category) {
            // Checkout reminders could be implemented later if needed
            console.log(`Would send checkout reminder for booking ${booking.bookingId}`);
          }
        } catch (error) {
          console.error(`Error sending checkout reminder for booking ${booking.bookingId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in checkout reminder task:", error);
    }
  });
  
  console.log("Checkout reminder task scheduled for 9:00 AM daily");
}

// Send check-in day reminders at 8:00 AM daily for today's check-ins
export function startCheckinDayReminderTask() {
  cron.schedule("0 8 * * *", async () => {
    console.log("Running check-in day reminder task...");
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get bookings checking in today
      const bookings = await storage.getBookingsByDateRange(today, tomorrow);
      const todayCheckins = bookings.filter(booking => 
        booking.status === "confirmed" && 
        new Date(booking.checkinDate).toDateString() === today.toDateString()
      );
      
      console.log(`Found ${todayCheckins.length} check-ins for today`);
      
      for (const booking of todayCheckins) {
        try {
          const user = booking.userId ? await storage.getUser(booking.userId) : null;
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          
          if (category) {
            // Send email notification
            await sendCheckinDayWelcomeEmail(booking, user || null, category);
            
            // Send WhatsApp notification
            try {
              await whatsappService.sendCheckinDayWelcome(booking, user || null, category);
            } catch (whatsappError) {
              console.error(`WhatsApp check-in day welcome failed for ${booking.bookingId}:`, whatsappError);
            }
          }
        } catch (error) {
          console.error(`Error sending check-in day reminder for booking ${booking.bookingId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in check-in day reminder task:", error);
    }
  });
  
  console.log("Check-in day reminder task scheduled for 8:00 AM daily");
}

// Send post-checkout feedback requests at 6:00 PM daily for yesterday's check-outs
export function startPostCheckoutFeedbackTask() {
  cron.schedule("0 18 * * *", async () => {
    console.log("Running post-checkout feedback task...");
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);
      
      // Get bookings that checked out yesterday
      const bookings = await storage.getBookingsByDateRange(yesterday, today);
      const yesterdayCheckouts = bookings.filter(booking => 
        booking.status === "checked_out" && 
        new Date(booking.checkoutDate).toDateString() === yesterday.toDateString()
      );
      
      console.log(`Found ${yesterdayCheckouts.length} check-outs from yesterday for feedback`);
      
      for (const booking of yesterdayCheckouts) {
        try {
          const user = booking.userId ? await storage.getUser(booking.userId) : null;
          const category = await storage.getRoomCategory(booking.roomCategoryId);
          
          if (category) {
            // Send email notification
            await sendPostCheckoutFeedbackEmail(booking, user || null, category);
            
            // Send WhatsApp notification (feedback requests are typically email-only, but could be added if needed)
            // Note: Feedback requests usually work better via email with forms/links
          }
        } catch (error) {
          console.error(`Error sending post-checkout feedback for booking ${booking.bookingId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in post-checkout feedback task:", error);
    }
  });
  
  console.log("Post-checkout feedback task scheduled for 6:00 PM daily");
}

// Send daily WhatsApp room availability reports at 7:00 PM daily for next day
export function startDailyRoomReportTask() {
  cron.schedule("0 19 * * *", async () => {
    console.log("Running daily room availability report task...");
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      // Get tomorrow's bookings
      const tomorrowBookings = await storage.getBookingsByDateRange(tomorrow, dayAfterTomorrow);
      const confirmedBookings = tomorrowBookings.filter(booking => booking.status === "confirmed");
      
      // Calculate statistics
      let totalRoomsBooked = 0;
      let totalGuests = 0;
      
      confirmedBookings.forEach(booking => {
        totalRoomsBooked += booking.roomsBooked || 1;
        totalGuests += booking.guests;
      });
      
      // Get room categories to calculate total available rooms
      const roomCategories = await storage.getRoomCategories();
      const totalRoomsAvailable = roomCategories.reduce((sum, cat) => sum + cat.totalUnits, 0) - totalRoomsBooked;
      
      // Format date for message
      const formattedDate = tomorrow.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Get notification recipients for daily reports
      const recipients = await storage.getActiveWhatsAppNotificationRecipients('daily_report');
      
      console.log(`Sending daily report to ${recipients.length} recipients: ${totalRoomsBooked} booked, ${totalRoomsAvailable} available, ${totalGuests} guests for ${formattedDate}`);
      
      // Send to all recipients
      for (const recipient of recipients) {
        try {
          await whatsappService.sendDailyRoomReport(
            recipient.phoneNumber,
            totalRoomsBooked,
            totalRoomsAvailable,
            totalGuests,
            formattedDate
          );
        } catch (error) {
          console.error(`Failed to send daily report to ${recipient.name} (${recipient.phoneNumber}):`, error);
        }
      }
      
    } catch (error) {
      console.error("Error in daily room report task:", error);
    }
  });
  
  console.log("Daily room report task scheduled for 7:00 PM daily");
}

// Check for sold out inventory and send alerts
export function startSoldOutAlertTask() {
  cron.schedule("0 */4 * * *", async () => { // Run every 4 hours
    console.log("Running sold out alert check task...");
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check next 7 days for sold out dates
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);
        
        const nextDay = new Date(checkDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Get bookings for this date
        const dateBookings = await storage.getBookingsByDateRange(checkDate, nextDay);
        const confirmedBookings = dateBookings.filter(booking => booking.status === "confirmed");
        
        // Calculate total booked rooms
        const totalRoomsBooked = confirmedBookings.reduce((sum, booking) => sum + (booking.roomsBooked || 1), 0);
        
        // Get total available rooms
        const roomCategories = await storage.getRoomCategories();
        const totalRoomsAvailable = roomCategories.reduce((sum, cat) => sum + cat.totalUnits, 0);
        
        // Check if sold out (100% occupancy)
        if (totalRoomsBooked >= totalRoomsAvailable && totalRoomsAvailable > 0) {
          const formattedDate = checkDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Get notification recipients for sold out alerts
          const recipients = await storage.getActiveWhatsAppNotificationRecipients('sold_out_alert');
          
          console.log(`SOLD OUT ALERT: ${formattedDate} - sending to ${recipients.length} recipients`);
          
          // Send alerts to all recipients
          for (const recipient of recipients) {
            try {
              await whatsappService.sendSoldOutAlert(recipient.phoneNumber, formattedDate);
            } catch (error) {
              console.error(`Failed to send sold out alert to ${recipient.name} (${recipient.phoneNumber}):`, error);
            }
          }
        }
      }
      
    } catch (error) {
      console.error("Error in sold out alert task:", error);
    }
  });
  
  console.log("Sold out alert task scheduled for every 4 hours");
}

// Compare what Razorpay actually captured against payment_transactions once
// a day, so a payment that never got recorded (webhook down, browser
// closed mid-flow, some future bug) is caught by a server log instead of
// only being noticed when a customer complains or a bank statement is checked.
export function startPaymentReconciliationTask() {
  cron.schedule("30 6 * * *", async () => {
    console.log("Running Razorpay payment reconciliation task...");

    try {
      const result = await findUnmatchedRazorpayPayments(2);
      if (result.unmatchedCount > 0) {
        console.error(
          `⚠️ PAYMENT RECONCILIATION ALERT: ${result.unmatchedCount} Razorpay payment(s) captured in the last 2 days have no matching completed booking payment. Check GET /api/admin/razorpay-reconciliation. Details:`,
          JSON.stringify(result.unmatched, null, 2)
        );
      } else {
        console.log(`Payment reconciliation: all ${result.totalCaptured} captured payment(s) in range are accounted for.`);
      }
    } catch (error) {
      console.error("Error in payment reconciliation task:", error);
    }
  });

  console.log("Payment reconciliation task scheduled for 6:30 AM daily");
}

// Start all scheduled tasks
export function initializeScheduledTasks() {
  startPreCheckinReminderTask();
  startCheckinDayReminderTask();
  startCheckoutReminderTask();
  startPostCheckoutFeedbackTask();
  startDailyRoomReportTask();
  startSoldOutAlertTask();
  startPaymentReconciliationTask();
  console.log("All notification tasks initialized (email + WhatsApp)");
}