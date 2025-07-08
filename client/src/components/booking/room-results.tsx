import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Bed } from "lucide-react";
import GuestDetailsForm from "./guest-details-form";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

interface RoomResultsProps {
  bookingData: BookingFormData;
  availabilityData: RoomAvailability;
}

export default function RoomResults({ bookingData, availabilityData }: RoomResultsProps) {
  const [showGuestForm, setShowGuestForm] = useState(false);

  const { category } = availabilityData;
  const checkinDate = new Date(bookingData.checkinDate);
  const checkoutDate = new Date(bookingData.checkoutDate);
  const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleSelectRoom = () => {
    setShowGuestForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h3 className="text-2xl font-bold text-gray-900 mb-8">Available Rooms</h3>
      
      <Card className="shadow-lg overflow-hidden mb-6">
        <div className="md:flex">
          <div className="md:w-1/3">
            <img 
              src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
              alt="Hotel room with modern amenities" 
              className="w-full h-48 md:h-full object-cover"
            />
          </div>
          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{category.name}</h4>
                <p className="text-gray-600 mt-1">{category.description || "Spacious room with modern amenities, AC, WiFi, and attached bathroom"}</p>
                <div className="flex items-center mt-3 space-x-4">
                  <span className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    <span>Up to {category.maxOccupancy || 2} Guests</span>
                  </span>
                  <span className="flex items-center text-sm text-gray-500">
                    <Bed className="w-4 h-4 mr-1" />
                    <span>{category.bedConfiguration || "1 Double Bed"}</span>
                  </span>
                  <span className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{availabilityData.availableUnits} Available</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">₹{category.price}</p>
                <p className="text-sm text-gray-500">per night</p>
                <p className="text-sm text-gray-600 mt-1">Total: ₹{(parseFloat(category.price) * nights).toLocaleString()}</p>
                <Button 
                  className="mt-3 bg-brand-orange hover:bg-brand-orange-light"
                  onClick={handleSelectRoom}
                  disabled={showGuestForm}
                >
                  {showGuestForm ? "Selected" : "Select Room"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showGuestForm && (
        <GuestDetailsForm 
          bookingData={bookingData}
          availabilityData={availabilityData}
          onCancel={() => setShowGuestForm(false)}
        />
      )}
    </div>
  );
}
