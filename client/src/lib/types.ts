import type { RoomCategory, User, RoomBooking } from "@shared/schema";

export interface BookingFormData {
  checkinDate: string;
  checkoutDate: string;
  guests: number;
}

export interface GuestFormData {
  name: string;
  email: string;
  mobile: string;
  paymentMethod: "online" | "checkin";
}

export interface RoomAvailability {
  available: boolean;
  availableUnits: number;
  totalUnits: number;
  category: RoomCategory;
  roomCategoryId?: number;
  roomsNeeded?: number;
  guestsPerRoom?: number;
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
