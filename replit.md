# Hotel Room Booking Platform

## Overview

This is a comprehensive hotel room booking platform built for Sri Shankeshwar Bengaluru Bhavan, located in Shankheshwar, Gujarat (near the sacred Parshwanath Temple). The system supports a single-property hotel with two room categories, accommodating both regular customers and privileged trustees with auto-booking capabilities. The platform features a customer-facing booking interface, admin dashboard for complete management, and trustee management system.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Build Tools**: ESBuild for production builds, TSX for development

### Project Structure
- `/client` - React frontend application
- `/server` - Express.js backend API
- `/shared` - Shared TypeScript schemas and types
- `/migrations` - Database migration files

## Key Components

### User Management
- **Customer Portal**: Public booking interface with room search and guest details
- **Admin Dashboard**: Complete booking and guest management system
- **Trustee System**: Privileged users with auto-booking capabilities (2 days/month)

### Room Management
- **Room Categories**: Two configurable room types with pricing and unit limits
- **Availability Engine**: Real-time room availability checking with date range queries
- **Booking System**: Support for online payments and pay-at-check-in options

### Database Schema
- **Room Categories**: Configurable room types with pricing and unit counts
- **Users**: Customer and trustee information with auto-booking preferences
- **Room Bookings**: Booking records with status tracking and payment information
- **ID Proofs**: Document management for guest identification
- **Admin Users**: Administrative access control

## Data Flow

### Booking Process
1. Customer searches for available rooms by date and category
2. System checks availability against existing bookings
3. Customer provides guest details and payment preference
4. Booking is created with unique booking ID
5. Email notifications are triggered for confirmation

### Trustee Auto-Booking
1. Admin triggers monthly auto-booking process
2. System identifies active trustees with configured booking dates
3. Automatic bookings are created for available dates
4. Email notifications sent to trustees with opt-out options

### Admin Operations
1. Dashboard displays real-time statistics and recent bookings
2. Check-in/check-out management with status updates
3. ID proof verification and management
4. Trustee configuration and auto-booking controls

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI primitives with Shadcn/ui
- **State Management**: TanStack Query for data fetching
- **Validation**: Zod for runtime type checking
- **Styling**: Tailwind CSS with PostCSS processing

### Development Tools
- **Build System**: Vite for frontend, ESBuild for backend
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier (implied by project structure)

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with hot module replacement
- TSX for backend development with auto-restart
- Replit integration with runtime error overlay

### Production Build
- Frontend built with Vite to `/dist/public`
- Backend bundled with ESBuild to `/dist/index.js`
- Static file serving through Express.js
- Environment variables for database connectivity

### Database Management
- Drizzle Kit for schema management and migrations
- PostgreSQL connection through Neon serverless driver
- Session storage in PostgreSQL using connect-pg-simple

## Changelog
```
Changelog:
- July 22, 2025: Enhanced email templates with food details - booking confirmation emails now include detailed food breakdown with breakfast/lunch/dinner days and amounts when food is ordered
- July 22, 2025: Fixed duplicate WhatsApp notifications issue - removed WhatsApp calls from email functions to ensure single notification per booking, WhatsApp integration now sends exactly one message per event
- July 22, 2025: Successfully implemented WhatsApp WABA integration with Meta-approved templates - fixed API language format from string to JSON object, implemented parameter count matching for different templates (hello_world expects 0 parameters), phone number formatting with country code 91, WhatsApp notifications now fully operational alongside email system
- July 22, 2025: Successfully implemented hybrid email system with AWS SES and SMTP fallback - email system now fully functional using working SMTP credentials with automatic fallback from AWS SES, all email notifications operational
- July 21, 2025: Implemented comprehensive email notification system with four types of automated emails: booking cancellation notifications, pre-check-in reminders (1 day before), check-in day welcome emails, and post-checkout feedback requests with professional HTML templates
- July 21, 2025: Added complete user password reset flow with secure token-based authentication, forgot password functionality, email verification system, and dedicated reset pages with proper routing
- July 21, 2025: Enhanced scheduled email tasks with cron jobs running at optimal times: pre-check-in reminders (10 AM), check-in day notifications (8 AM), checkout reminders (9 AM), and feedback requests (6 PM)
- July 21, 2025: Created professional email templates with branded styling, clear information sections, actionable content, and both HTML and text versions for all notification types
- July 21, 2025: Added actual check-in and check-out timestamp display throughout admin interface - timestamps now show in booking details and check-in/checkout screens
- July 21, 2025: Enhanced check-in/checkout functionality with cancel booking option for checked-in guests - admin can now cancel bookings even after guests are checked in
- July 21, 2025: Added comprehensive Food Settings management interface in admin panel for configurable breakfast, lunch, and dinner donation amounts with real-time updates
- July 21, 2025: Fixed ID proof viewer modal issues by replacing complex modal system with simple new tab functionality - ID proof images now open directly in new browser tabs for better user experience
- July 21, 2025: Implemented complete file upload and serving system with multer middleware for actual image storage and Express static file serving for ID proof images
- July 21, 2025: Implemented comprehensive enhanced booking system with full address collection, travel details (arriving from/going to), ETA/ETD tracking, multiple government ID support, check-in/out time recording, and optional food booking system with admin-configurable pricing (breakfast/lunch/dinner)
- July 21, 2025: Updated database schema to support new booking features: address fields, travel information, food booking options, multiple ID proof types, and actual check-in/check-out timestamps
- July 21, 2025: Enhanced guest details form with sectioned layout including address details, travel information, and food options with real-time pricing and total calculation
- July 21, 2025: Added food settings management in admin panel for configurable breakfast, lunch, and dinner pricing
- July 21, 2025: Updated booking terminology to consistently use "donations" instead of "amounts" throughout the application
- July 12, 2025: Implemented comprehensive AWS SES email notification system with booking confirmations, cancellation notices, pre-check-in reminders, and check-out notifications using scheduled cron jobs
- July 12, 2025: Added camera functionality for Aadhaar uploads with live camera feed, positioning guide, capture/review process, and auto-upload
- July 12, 2025: Implemented user deletion functionality that preserves bookings and transaction history while removing user accounts, with smart confirmation dialogs
- July 09, 2025: Updated property location details throughout the application to reflect actual Gujarat location (Shankheshwar, Patan District) with correct contact information, transportation details, and local landmarks
- July 09, 2025: Fixed admin booking button submission and added payment reference field for UPI/Card/Bank Transfer payments with dynamic labels and database storage
- July 09, 2025: Enhanced admin booking form with real-time room capacity validation, preventing bookings with insufficient room capacity for guest count
- July 08, 2025: Fixed real-time inventory updates - rooms now properly show reduced availability after bookings
- July 08, 2025: Enhanced admin dashboard with detailed booking modal, ID proof uploads, and payment management
- July 08, 2025: Added comprehensive booking details modal with guest info, room assignment, and status controls
- July 08, 2025: Simplified booking flow to only ask for dates and guest count
- July 08, 2025: Added admin booking functionality with comprehensive form
- July 08, 2025: Added room availability display in admin inventory management
- July 08, 2025: Fixed booking errors related to missing userId in booking creation
- July 07, 2025: Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```