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
import { Calendar, User, BookOpen, CalendarX, MessageSquare } from "lucide-react";
import type { BookingFormData, RoomAvailability } from "@/lib/types";
import type { User as UserType } from "@shared/schema";

export default function Home() {
  const [searchResults, setSearchResults] = useState<{
    bookingData: BookingFormData;
    availabilityData: any;
  } | null>(null);
  const [noRoomsSearch, setNoRoomsSearch] = useState<BookingFormData | null>(null);
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const handleSearch = (data: BookingFormData, availability: any) => {
    setNoRoomsSearch(null);
    setSearchResults({ bookingData: data, availabilityData: availability });
  };

  const handleNoRooms = (data: BookingFormData) => {
    setSearchResults(null);
    setNoRoomsSearch(data);
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
              <SimpleBookingForm onSearch={handleSearch} onNoRooms={handleNoRooms} />
            </div>
          </div>
        </div>
      </section>

      {/* Fully Booked - stays on the page until a new search, unlike the toast */}
      {noRoomsSearch && (
        <section id="room-results" className="py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-8 text-center">
                <CalendarX className="w-12 h-12 text-brand-orange mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fully Booked for These Dates</h3>
                <p className="text-gray-600 mb-1">
                  {noRoomsSearch.checkinDate} to {noRoomsSearch.checkoutDate}
                </p>
                <p className="text-gray-600 mb-6">
                  All rooms are reserved for the dates you selected. This is common during festival periods -
                  please try nearby dates, or contact us directly and we'll help you find a way to accommodate your visit.
                </p>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Hi, I tried to book from ${noRoomsSearch.checkinDate} to ${noRoomsSearch.checkoutDate} but no rooms were available. Can you help?`
                    );
                    window.open(`https://wa.me/919727070765?text=${message}`, '_blank');
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask Us on WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

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
