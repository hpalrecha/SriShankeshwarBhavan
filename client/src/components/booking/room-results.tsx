import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Bed, CheckCircle } from "lucide-react";
import GuestDetailsForm from "./guest-details-form";
import type { BookingFormData, RoomAvailability } from "@/lib/types";
import type { RoomCategory } from "@shared/schema";

interface RoomResultsProps {
  bookingData: BookingFormData;
  availabilityData: RoomAvailability;
}

export default function RoomResults({ bookingData, availabilityData }: RoomResultsProps) {
  const [showGuestForm, setShowGuestForm] = useState(false);

  const { data: allCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const { category } = availabilityData;
  const checkinDate = new Date(bookingData.checkinDate);
  const checkoutDate = new Date(bookingData.checkoutDate);
  const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalPrice = parseFloat(category.price) * nights;

  // Find all suitable categories for the guest count
  const suitableCategories = allCategories.filter(cat => (cat.maxOccupancy || 2) >= bookingData.guests);
  const isAutoSelected = suitableCategories.length > 1;

  const handleSelectRoom = () => {
    setShowGuestForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Available Rooms</h3>
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="text-green-800 text-sm">
            {availabilityData.roomsNeeded && availabilityData.roomsNeeded > 1 ? (
              <div>
                <p className="font-medium">Multiple rooms recommended for {bookingData.guests} guests</p>
                <p>We suggest booking {availabilityData.roomsNeeded} × {category.name} rooms ({availabilityData.guestsPerRoom} guests per room)</p>
              </div>
            ) : (
              <p>
                We've automatically selected the best room for {bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}. 
                {suitableCategories.length > 1 && ` ${suitableCategories.length} room types can accommodate your group.`}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <Card className="shadow-lg overflow-hidden mb-6">
        <div className="md:flex">
          <div className="md:w-1/3">
            {category.imageUrl ? (
              <img 
                src={category.imageUrl} 
                alt={category.name}
                className="w-full h-48 md:h-full object-cover"
              />
            ) : (
              <div className="w-full h-48 md:h-full bg-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-2">🏨</div>
                  <p className="text-sm">No image available</p>
                </div>
              </div>
            )}
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

                </div>
                
                {isAutoSelected && (
                  <div className="mt-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Best Match for {bookingData.guests} Guest{bookingData.guests > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="text-right">
                {availabilityData.roomsNeeded && availabilityData.roomsNeeded > 1 ? (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">₹{category.price} × {availabilityData.roomsNeeded}</p>
                    <p className="text-sm text-gray-500">per night ({availabilityData.roomsNeeded} rooms)</p>
                    <p className="text-sm text-gray-600 mt-1">Total: ₹{(parseFloat(category.price) * nights * availabilityData.roomsNeeded).toLocaleString()}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">₹{category.price}</p>
                    <p className="text-sm text-gray-500">per night</p>
                    <p className="text-sm text-gray-600 mt-1">Total: ₹{(parseFloat(category.price) * nights).toLocaleString()}</p>
                  </div>
                )}
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

      {/* Show other available room options if multiple exist */}
      {suitableCategories.length > 1 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Other Available Room Types</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suitableCategories
              .filter(cat => cat.id !== category.id)
              .map((roomCat) => (
                <Card key={roomCat.id} className="p-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-gray-900">{roomCat.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Up to {roomCat.maxOccupancy || 2} guests • {roomCat.bedConfiguration || "1 Double Bed"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{roomCat.price}/night</p>
                      <p className="text-sm text-gray-500">₹{(parseFloat(roomCat.price) * nights).toLocaleString()} total</p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            We've selected the {category.name} as it offers the best value for your {bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}.
          </p>
        </div>
      )}

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
