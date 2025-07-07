import { useState } from "react";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import BookingForm from "@/components/booking/booking-form";
import RoomResults from "@/components/booking/room-results";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

export default function Home() {
  const [currentTab, setCurrentTab] = useState("booking");
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);
  const [availabilityData, setAvailabilityData] = useState<RoomAvailability | null>(null);

  const handleSearch = (data: BookingFormData, availability: RoomAvailability) => {
    setBookingData(data);
    setAvailabilityData(availability);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Tabs currentTab={currentTab} onTabChange={setCurrentTab} />
      
      {currentTab === "booking" && (
        <div>
          {/* Booking Hero Section */}
          <div className="bg-gradient-to-r from-brand-orange-bg to-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Book Your Stay</h2>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Experience comfort and convenience at Sri Shankeshwar Bengaluru Bhavan
                </p>
              </div>
              
              <div className="mt-10 max-w-3xl mx-auto">
                <BookingForm onSearch={handleSearch} />
              </div>
            </div>
          </div>

          {/* Room Results */}
          {bookingData && availabilityData && (
            <RoomResults 
              bookingData={bookingData} 
              availabilityData={availabilityData} 
            />
          )}
        </div>
      )}
    </div>
  );
}
