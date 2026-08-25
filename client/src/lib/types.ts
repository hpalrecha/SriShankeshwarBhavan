import type { RoomCategory, User, RoomBooking } from "@shared/schema";

export interface BookingFormData {
  checkinDate: string;
  checkoutDate: string;
  guests: number;
  // Travel details
  arrivingFrom?: string;
  goingTo?: string;
  estimatedArrivalTime?: string;
  estimatedDepartureTime?: string;
  // Food options
  breakfastDays?: number;
  lunchDays?: number;
  dinnerDays?: number;
}

export interface GuestFormData {
  name: string;
  email?: string;
  mobile: string;
  // Full address
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  paymentMethod: "pay_online" | "pay_at_checkin" | "checkin" | "online";
}

export interface FoodSettings {
  id?: number;
  breakfastPrice: string;
  lunchPrice: string;
  dinnerPrice: string;
  updatedAt?: string;
}

export interface RoomAvailability {
  available: boolean;
  availableUnits: number;
  totalUnits: number;
  category: RoomCategory;
  roomCategoryId?: number;
  roomsNeeded?: number;
  guestsPerRoom?: number;
  availableRooms?: RoomAvailability[];
  totalGuests?: number;
  canAccommodateGuests?: boolean;
  trusteeOnly?: boolean;
}

export interface BookingWithDetails {
  booking: RoomBooking;
  user: User;
  category: RoomCategory;
}

export interface DashboardStats {
  todayBookings: number;
  checkedIn: number;
  revenue: number;
  occupancy: string;
}

export interface TrusteeFormData {
  name: string;
  email: string;
  mobile: string;
  trusteeAutoBookDates?: string;
  trusteeRoomCategoryId?: number;
  trusteeStatus?: string;
}
