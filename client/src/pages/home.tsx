import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/Footer";
import SimpleBookingForm from "@/components/booking/simple-booking-form";
import RoomResults from "@/components/booking/room-results";
import RoomSelection from "@/components/booking/room-selection";
import HeroSection from "@/components/home/hero-section";
import AmenitiesSection from "@/components/home/amenities-section";
import LocationSection from "@/components/home/location-section";
import ContactSection from "@/components/home/contact-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, BookOpen } from "lucide-react";
import type { BookingFormData, RoomAvailability } from "@/lib/types";
import type { User as UserType } from "@shared/schema";

export default function Home() {
  const [searchResults, setSearchResults] = useState<{
    bookingData: BookingFormData;
    availabilityData: any;
  } | null>(null);
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const handleSearch = (data: BookingFormData, availability: any) => {
    setSearchResults({ bookingData: data, availabilityData: availability });
  };

  // If user is authenticated, show a welcome section instead of just the booking form
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section with Property Image */}
      <HeroSection />

      {/* Welcome Section for Authenticated Users or Booking Form */}
      <section id="booking" className="relative -mt-20 z-10 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            {isAuthenticated && user ? (
              // Welcome section for logged in users
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h2>
                <p className="mt-2 text-gray-600">Ready to make another booking or manage your existing reservations?</p>
                <div className="flex justify-center gap-4 mt-6">
                  <Button 
                    onClick={() => setLocation('/my-bookings')}
                    className="bg-brand-orange hover:bg-brand-orange-light"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    My Bookings
                  </Button>
                  <Button 
                    onClick={() => {
                      // Clear search results to show fresh booking form
                      setSearchResults(null);
                      const bookingSection = document.getElementById('booking-form');
                      if (bookingSection) {
                        bookingSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    variant="outline"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Make New Booking
                  </Button>
                </div>
              </div>
            ) : (
              // Regular booking form for guests
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Find Your Perfect Room</h2>
                <p className="mt-2 text-gray-600">Select your dates and discover available accommodations</p>
              </div>
            )}
            
            {/* Show booking form if not authenticated OR if authenticated user wants to make new booking */}
            <div id="booking-form">
              <SimpleBookingForm onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </section>

      {/* Room Results */}
      {searchResults && (
        <section id="room-results" className="py-8">
          {searchResults.availabilityData?.availableRooms && searchResults.availabilityData.availableRooms.length > 0 ? (
            <RoomSelection 
              bookingData={searchResults.bookingData}
              availabilityData={searchResults.availabilityData}
            />
          ) : (
            <RoomResults 
              bookingData={searchResults.bookingData}
              availabilityData={searchResults.availabilityData}
            />
          )}
        </section>
      )}

      {/* Amenities Section */}
      <AmenitiesSection />

      {/* Location Section */}
      <LocationSection />

      {/* Contact Section */}
      <ContactSection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
