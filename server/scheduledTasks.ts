import cron from "node-cron";
import { storage } from "./storage";
import { sendPreCheckinReminderEmail, sendCheckoutReminderEmail } from "./email";

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
            await sendPreCheckinReminderEmail({
              booking,
              user,
              category,
              guestName: booking.guestName,
              guestEmail: booking.guestEmail,
            });
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
            await sendCheckoutReminderEmail({
              booking,
              user,
              category,
              guestName: booking.guestName,
              guestEmail: booking.guestEmail,
            });
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

// Start all scheduled tasks
export function initializeScheduledTasks() {
  startPreCheckinReminderTask();
  startCheckoutReminderTask();
  console.log("All email notification tasks initialized");
}