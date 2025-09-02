# Hotel Room Booking Platform

## Overview
This platform is a comprehensive hotel room booking system designed for Sri Shankeshwar Bengaluru Bhavan, a single-property hotel in Shankheshwar, Gujarat. Its primary purpose is to manage room bookings for two categories of rooms, catering to both regular customers and privileged trustees. Key capabilities include a customer-facing booking interface, an administrative dashboard for full management, and a dedicated system for trustee reservations. The project aims to streamline the booking process, manage room inventory efficiently, and provide a robust solution for the hotel's operational needs, supporting its vision for enhanced guest experience and administrative control.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **UI Library**: Shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Modern, clean design with emphasis on user-friendliness. Features include a streamlined booking process, clear navigation for admin, and responsive layouts for various devices. The design incorporates custom theming and consistent component usage.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Connect-pg-simple
- **Build Tools**: ESBuild (production), TSX (development)
- **Technical Implementations**: Asynchronous processing for notifications (email, WhatsApp) to optimize booking confirmation time. Secure token-based password reset flow. Comprehensive email and WhatsApp notification system for booking updates. ICICI Bank payment gateway integration with HMAC SHA-256 secure hash verification and webhook processing.
- **Feature Specifications**:
    - **User Management**: Customer portal, admin dashboard for booking/guest management, and trustee management system.
    - **Room Management**: Configurable room types, real-time availability engine, and support for online/pay-at-check-in options.
    - **Booking System**: Online booking, ID proof management, travel details capture, optional food booking, and check-in/out timestamp recording.
    - **Admin Operations**: Dashboard with real-time statistics, check-in/out management, ID proof verification, and trustee configuration.
    - **Data Flow**: Structured booking process from search to confirmation. Admin operations include managing users, rooms, and bookings, and generating reports. Trustee bookings are manual.
- **System Design Choices**: Monorepo structure (`client`, `server`, `shared`, `migrations`). Scalable database design with clear schema for rooms, users, bookings, ID proofs, and admin users. Emphasis on modularity and separation of concerns.

## External Dependencies

- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI (via Shadcn/ui)
- **State Management**: TanStack Query
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Email Service**: AWS SES with SMTP fallback
- **Messaging**: Meta WhatsApp Business API (WABA) for notifications
- **Payment Gateway**: ICICI Bank PhiCommerce API (primary), Razorpay (secondary)
- **File Upload**: Multer (for ID proof storage)
- **Scheduled Tasks**: Cron jobs (for automated email reminders)
```