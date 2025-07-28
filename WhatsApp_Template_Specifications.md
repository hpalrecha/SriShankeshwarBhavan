# WhatsApp Message Templates for Meta Approval

## Template 1: Pre Check-in Reminder
**Template Name:** `pre_checkin_reminder`
**Notification Type:** `pre_checkin_reminder`
**Trigger:** Daily at 10:00 AM for tomorrow's check-ins

### Message Template:
```
Hello {{1}}, 

Your check-in at Sri Shankeshwar Bengaluru Bhavan is tomorrow! 

Booking Details:
- Booking ID: {{2}}
- Check-in Date: {{3}}
- Room Type: {{4}}

Please arrive between 12:00 PM - 6:00 PM. Carry valid ID proof.

Contact: +91 9876543210

Looking forward to hosting you!
```

### Variables Sent:
1. `{{1}}` - Guest Name (user.name or booking.primaryGuestName)
2. `{{2}}` - Booking ID (booking.bookingId) 
3. `{{3}}` - Check-in Date (formatted as DD/MM/YYYY)
4. `{{4}}` - Room Category Name (category.name)

---

## Template 2: Check-in Day Welcome
**Template Name:** `checkin_day_welcome`
**Notification Type:** `checkin_day_welcome`
**Trigger:** Daily at 8:00 AM for today's check-ins

### Message Template:
```
Welcome to Sri Shankeshwar Bengaluru Bhavan! 

Dear {{1}}, today is your check-in day.

Booking Details:
- Booking ID: {{2}}
- Room Type: {{3}}

Check-in Time: 12:00 PM onwards
Location: Near Parshwanath Temple, Shankheshwar

We're ready to welcome you!
```

### Variables Sent:
1. `{{1}}` - Guest Name (user.name or booking.primaryGuestName)
2. `{{2}}` - Booking ID (booking.bookingId)
3. `{{3}}` - Room Category Name (category.name)

---

## Template 3: Booking Cancellation
**Template Name:** `booking_cancellation`
**Notification Type:** `booking_cancellation`
**Trigger:** When booking is cancelled via admin panel

### Message Template:
```
Booking Cancelled - Sri Shankeshwar Bengaluru Bhavan

Dear {{1}},

Your booking has been cancelled.

Booking Details:
- Booking ID: {{2}}
- Room Type: {{3}}

If you have any questions, please contact us at +91 9876543210.

Thank you for choosing us.
```

### Variables Sent:
1. `{{1}}` - Guest Name (user.name or booking.primaryGuestName)
2. `{{2}}` - Booking ID (booking.bookingId)
3. `{{3}}` - Room Category Name (category.name)

---

## Template 4: Post Checkout Feedback
**Template Name:** `post_checkout_feedback`
**Notification Type:** `post_checkout_feedback`
**Trigger:** Daily at 6:00 PM for recent checkouts

### Message Template:
```
Thank you for staying with us!

Dear {{1}},

We hope you had a blessed stay at Sri Shankeshwar Bengaluru Bhavan.

Booking ID: {{2}}

Please share your feedback to help us serve you better. Your experience matters to us.

Visit again soon! 🙏
```

### Variables Sent:
1. `{{1}}` - Guest Name (user.name or booking.primaryGuestName)
2. `{{2}}` - Booking ID (booking.bookingId)

---

## Existing Template: Booking Confirmation
**Template Name:** `test_bhavan_booking` (already approved and working)
**Notification Type:** `booking_confirmation`
**Trigger:** Immediately when booking is created

### Variables Sent (already working):
1. Guest Name
2. Booking ID  
3. Room Category
4. Check-in Date
5. Check-out Date
6. Number of Guests
7. Total Amount

---

## Template Configuration in Admin Panel

After Meta approves these templates, you need to:

1. Go to Admin Panel → WhatsApp Settings → Templates
2. Map each notification type to the approved template name:
   - `pre_checkin_reminder` → Your approved template name
   - `checkin_day_welcome` → Your approved template name  
   - `booking_cancellation` → Your approved template name
   - `post_checkout_feedback` → Your approved template name

## Meta Template Submission Guidelines

- Language: English (en)
- Category: UTILITY (for booking-related notifications)
- Variables: Use {{1}}, {{2}}, {{3}}, {{4}} format
- Keep content professional and informative
- Include clear business purpose (hotel booking notifications)
- Mention your business name: "Sri Shankeshwar Bengaluru Bhavan"

The system will automatically use these templates once approved and mapped in your admin panel.