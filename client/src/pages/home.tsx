import { useState } from "react";
import Header from "@/components/layout/header";
import BookingForm from "@/components/booking/booking-form";
import RoomResults from "@/components/booking/room-results";
import HeroSection from "@/components/home/hero-section";
import AmenitiesSection from "@/components/home/amenities-section";
import LocationSection from "@/components/home/location-section";
import ContactSection from "@/components/home/contact-section";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

export default function Home() {
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);
  const [availabilityData, setAvailabilityData] = useState<RoomAvailability | null>(null);

  const handleSearch = (data: BookingFormData, availability: RoomAvailability) => {
    setBookingData(data);
    setAvailabilityData(availability);
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
            <BookingForm onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Room Results */}
      {bookingData && availabilityData && (
        <RoomResults 
          bookingData={bookingData} 
          availabilityData={availabilityData} 
        />
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
