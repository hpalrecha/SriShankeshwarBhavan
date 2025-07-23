import { useState } from "react";
import Header from "@/components/layout/header";
import SimpleBookingForm from "@/components/booking/simple-booking-form";
import RoomResults from "@/components/booking/room-results";
import RoomSelection from "@/components/booking/room-selection";
import HeroSection from "@/components/home/hero-section";
import AmenitiesSection from "@/components/home/amenities-section";
import LocationSection from "@/components/home/location-section";
import ContactSection from "@/components/home/contact-section";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

export default function Home() {
  const [searchResults, setSearchResults] = useState<{
    bookingData: BookingFormData;
    availabilityData: RoomAvailability;
  } | null>(null);

  const handleSearch = (data: BookingFormData, availability: any) => {
    setSearchResults({ bookingData: data, availabilityData: availability });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section with Property Image */}
      <HeroSection />

      {/* Booking Form Section */}
      <section className="relative -mt-20 z-10 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Find Your Perfect Room</h2>
              <p className="mt-2 text-gray-600">Select your dates and discover available accommodations</p>
            </div>
            <SimpleBookingForm onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Room Results */}
      {searchResults && (
        searchResults.availabilityData?.availableRooms && searchResults.availabilityData.availableRooms.length > 0 ? (
          <RoomSelection 
            bookingData={searchResults.bookingData}
            availabilityData={searchResults.availabilityData}
          />
        ) : (
          <RoomResults 
            bookingData={searchResults.bookingData}
            availabilityData={searchResults.availabilityData}
          />
        )
      )}

      {/* Amenities Section */}
      <AmenitiesSection />

      {/* Location Section */}
      <LocationSection />

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
}
