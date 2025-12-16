# Design Guidelines: Sri Shankeshwar Bengaluru Bhavan Booking Platform

## Design Approach: Hospitality Reference-Based

**Primary Inspiration:** Airbnb's welcoming visual hierarchy + small boutique hotel websites' intimate feel
**Core Principles:** 
- Traditional warmth meets modern efficiency
- Clear visual hierarchy guiding booking journey
- Trust-building through authentic imagery
- Streamlined functionality without complexity

---

## Typography System

**Font Families (Google Fonts):**
- Primary: 'Playfair Display' (headings) - elegant, traditional feel
- Secondary: 'Inter' (body, UI) - clean, modern readability

**Hierarchy:**
- Hero headline: text-5xl md:text-6xl font-bold (Playfair)
- Section headings: text-3xl md:text-4xl font-semibold (Playfair)
- Subsection titles: text-xl md:text-2xl font-medium (Inter)
- Body text: text-base md:text-lg (Inter)
- UI elements: text-sm md:text-base (Inter)
- Small print: text-xs md:text-sm (Inter)

---

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-16 md:py-24
- Element gaps: gap-4, gap-6, gap-8
- Grid gaps: gap-6 md:gap-8

**Container Strategy:**
- Full-width sections: w-full
- Content containers: max-w-7xl mx-auto px-6
- Reading content: max-w-4xl
- Forms: max-w-2xl

---

## Component Library

### Public-Facing Pages

**Hero Section (Full-width, 85vh)**
- Large hero image (warm interiors, traditional decor)
- Overlay gradient for text readability
- Centered content: Bhavan name, tagline, prominent booking CTA
- CTA button: Backdrop blur (backdrop-blur-md bg-white/20), rounded-lg px-8 py-4

**Room Showcase Grid**
- 2-column on tablet, 3-column on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Room cards: Image, room type, capacity, price, amenities icons, "Book Now" button
- Hover: Subtle lift (transform translate-y-[-4px])

**Amenities Section**
- Icon grid layout (4 columns desktop, 2 mobile)
- Icons: Heroicons outline style
- Each: Icon, title, brief description
- Examples: WiFi, Temple proximity, Dining, Parking

**Booking Form Section**
- 2-column layout (desktop): Form + summary card
- Form fields: Check-in/out dates, room type dropdown, guests, contact details
- Sticky summary card showing pricing breakdown
- Prominent submit button

**Testimonials**
- 2-column grid with guest photos
- Quote, name, location format
- Subtle card backgrounds

**Location & Contact**
- Split layout: Google Maps embed + contact details
- Address, phone, email, temple directions

**Footer**
- 3-column: About, Quick Links, Contact
- Newsletter signup
- Trust indicators (since establishment year, devotee count)

### Admin Dashboard

**Sidebar Navigation**
- Fixed left sidebar (w-64)
- Dashboard, Bookings, Rooms, Guests, Settings sections
- Active state highlighting

**Dashboard Overview**
- Stats cards grid (4 columns): Today's check-ins, occupancy rate, revenue, pending bookings
- Recent bookings table
- Occupancy calendar view

**Booking Management**
- Searchable/filterable table
- Columns: Booking ID, guest name, dates, room, status, actions
- Status badges (confirmed, pending, completed)

**Room Management**
- Grid + list view toggle
- Add/edit room modals
- Room status indicators (available, occupied, maintenance)

**Guest Database**
- Searchable list with pagination
- Guest cards showing booking history
- Quick action buttons

---

## Images

**Hero Section:**
- Large (1920x1080): Traditional Bhavan interior, warm lighting, traditional decor elements visible, welcoming entrance or main hall

**Room Showcase:**
- High-quality room photos (800x600 each)
- Variety: Standard rooms, deluxe, family suites
- Clean beds, traditional artwork, modern amenities

**Amenities/Features:**
- Supporting images: Dining area, temple view, common areas

**About Section:**
- Exterior photo of the Bhavan
- Group photo of staff/traditional hospitality

---

## Key Interactions

- Form validation: Inline error states below fields
- Loading states: Skeleton loaders for room cards
- Modal overlays: Booking confirmation, room details
- Date picker: Custom styled for brand consistency
- Toast notifications: Success/error messages (top-right)

**Icons:** Heroicons (via CDN) throughout for consistency