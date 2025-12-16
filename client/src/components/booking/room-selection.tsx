import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Calendar, Bed, Plus, Minus, CheckCircle } from "lucide-react";
import { smoothScrollToSection } from "@/lib/scroll-utils";
import GuestDetailsForm from "./guest-details-form";
import type { BookingFormData, RoomAvailability } from "@/lib/types";
import type { RoomCategory } from "@shared/schema";

interface RoomSelectionProps {
  bookingData: BookingFormData;
  availabilityData: { availableRooms: RoomAvailability[]; totalGuests: number };
}

interface RoomSelection {
  category: RoomCategory;
  quantity: number;
  maxAvailable: number;
  extraBeds: number;
}

export default function RoomSelection({ bookingData, availabilityData }: RoomSelectionProps) {
  const [selectedRooms, setSelectedRooms] = useState<RoomSelection[]>(
    availabilityData.availableRooms.map(room => ({
      category: room.category,
      quantity: 0,
      maxAvailable: room.availableUnits,
      extraBeds: 0
    }))
  );
  const [showGuestForm, setShowGuestForm] = useState(false);

  const checkinDate = new Date(bookingData.checkinDate);
  const checkoutDate = new Date(bookingData.checkoutDate);
  const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));

  const updateRoomQuantity = (categoryId: number, quantity: number) => {
    setSelectedRooms(prev => {
      // Calculate what total rooms would be if we make this change
      const newRooms = prev.map(room => {
        if (room.category.id === categoryId) {
          const newQuantity = Math.max(0, Math.min(quantity, room.maxAvailable));
          // Clamp extra beds when room quantity is reduced
          const maxExtraBeds = (room.category.extraBedMax ?? 1) * newQuantity;
          const newExtraBeds = Math.min(room.extraBeds, maxExtraBeds);
          return { ...room, quantity: newQuantity, extraBeds: newExtraBeds };
        }
        return room;
      });
      
      // Calculate total rooms that would be selected
      const newTotalRooms = newRooms.reduce((sum, room) => sum + room.quantity, 0);
      
      // CRITICAL: Prevent selecting more rooms than guests
      if (newTotalRooms > bookingData.guests) {
        // Don't allow this change - return previous state
        return prev;
      }
      
      return newRooms;
    });
  };

  const updateExtraBeds = (categoryId: number, extraBeds: number) => {
    setSelectedRooms(prev => 
      prev.map(room => {
        if (room.category.id === categoryId) {
          const maxExtraBeds = (room.category.extraBedMax ?? 1) * room.quantity;
          return { ...room, extraBeds: Math.max(0, Math.min(extraBeds, maxExtraBeds)) };
        }
        return room;
      })
    );
  };

  const totalRoomsSelected = selectedRooms.reduce((sum, room) => sum + room.quantity, 0);
  const totalCapacity = selectedRooms.reduce((sum, room) => sum + (room.quantity * (room.category.maxOccupancy || 2)), 0);
  const totalExtraBeds = selectedRooms.reduce((sum, room) => sum + room.extraBeds, 0);
  const extraBedPricePerNight = 200;
  const extraBedsCost = totalExtraBeds * extraBedPricePerNight * nights;
  const roomsCost = selectedRooms.reduce((sum, room) => sum + (room.quantity * parseFloat(room.category.price) * nights), 0);
  const totalCost = roomsCost + extraBedsCost;
  const hasValidSelection = totalRoomsSelected > 0 && totalCapacity >= availabilityData.totalGuests;

  const handleProceedToBooking = () => {
    setShowGuestForm(true);
    // Scroll to guest details form after a brief delay
    setTimeout(() => {
      smoothScrollToSection("guest-details");
    }, 100);
  };

  // Create a booking summary for the guest form
  const createBookingSummary = () => {
    const selectedRoomsList = selectedRooms.filter(room => room.quantity > 0);
    // For simplicity, we'll use the first selected room as the primary category
    // In a real system, you might want to create multiple bookings
    const primaryRoom = selectedRoomsList[0];
    
    return {
      available: true,
      availableUnits: primaryRoom.quantity,
      totalUnits: primaryRoom.maxAvailable,
      category: primaryRoom.category,
      selectedRooms: selectedRoomsList,
      totalCost,
      totalRoomsSelected,
      totalExtraBeds,
      extraBedsCost
    };
  };

  if (showGuestForm) {
    return (
      <div id="guest-details">
        <GuestDetailsForm 
          bookingData={bookingData}
          availabilityData={createBookingSummary() as any}
          onCancel={() => setShowGuestForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Your Rooms</h3>
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Users className="h-5 w-5 text-blue-600" />
          <p className="text-blue-800 text-sm">
            Choose room combinations for {availabilityData.totalGuests} guest{availabilityData.totalGuests > 1 ? 's' : ''}. 
            You can select multiple rooms of different types.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {selectedRooms.map((roomSelection) => {
          const { category } = roomSelection;
          return (
            <Card key={category.id} className="shadow-lg overflow-hidden">
              <div className="relative">
                {category.imageUrl ? (
                  <img 
                    src={category.imageUrl} 
                    alt={category.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">🏨</div>
                      <p className="text-sm">No image available</p>
                    </div>
                  </div>
                )}

              </div>
              
              <CardContent className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{category.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">{category.description || "Comfortable accommodation with modern amenities"}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Up to {category.maxOccupancy || 2} guests</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Bed className="w-4 h-4 mr-2" />
                    <span>{category.bedConfiguration || "1 Double Bed"}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-xl font-bold text-gray-900">₹{category.price}</p>
                      <p className="text-sm text-gray-500">per night</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor={`quantity-${category.id}`}>Number of rooms</Label>
                    {totalRoomsSelected >= bookingData.guests && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                        ⚠️ Cannot select more than {bookingData.guests} room{bookingData.guests === 1 ? '' : 's'} for {bookingData.guests} guest{bookingData.guests === 1 ? '' : 's'}
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateRoomQuantity(category.id, roomSelection.quantity - 1)}
                        disabled={roomSelection.quantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id={`quantity-${category.id}`}
                        type="number"
                        min="0"
                        max={roomSelection.maxAvailable}
                        value={roomSelection.quantity}
                        onChange={(e) => updateRoomQuantity(category.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateRoomQuantity(category.id, roomSelection.quantity + 1)}
                        disabled={roomSelection.quantity >= roomSelection.maxAvailable || totalRoomsSelected >= bookingData.guests}
                        title={totalRoomsSelected >= bookingData.guests ? `Cannot book more than ${bookingData.guests} room${bookingData.guests === 1 ? '' : 's'} for ${bookingData.guests} guest${bookingData.guests === 1 ? '' : 's'}` : ''}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {roomSelection.quantity > 0 && (
                      <div className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {roomSelection.quantity} room{roomSelection.quantity > 1 ? 's' : ''} selected
                        (₹{(roomSelection.quantity * parseFloat(category.price) * nights).toLocaleString()} total)
                      </div>
                    )}
                  </div>

                  {/* Extra Bed Selection - Only show when rooms are selected */}
                  {roomSelection.quantity > 0 && (category.extraBedMax ?? 1) > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <Label htmlFor={`extra-beds-${category.id}`} className="flex items-center gap-2 mb-2">
                        <Bed className="h-4 w-4 text-orange-500" />
                        Extra Beds (₹{extraBedPricePerNight}/bed/night)
                      </Label>
                      <div className="flex items-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateExtraBeds(category.id, roomSelection.extraBeds - 1)}
                          disabled={roomSelection.extraBeds === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id={`extra-beds-${category.id}`}
                          type="number"
                          min="0"
                          max={(category.extraBedMax ?? 1) * roomSelection.quantity}
                          value={roomSelection.extraBeds}
                          onChange={(e) => updateExtraBeds(category.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                          data-testid={`input-extra-beds-${category.id}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateExtraBeds(category.id, roomSelection.extraBeds + 1)}
                          disabled={roomSelection.extraBeds >= (category.extraBedMax ?? 1) * roomSelection.quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Max {(category.extraBedMax ?? 1) * roomSelection.quantity} extra bed{((category.extraBedMax ?? 1) * roomSelection.quantity) !== 1 ? 's' : ''} ({category.extraBedMax ?? 1} per room)
                      </p>
                      {roomSelection.extraBeds > 0 && (
                        <p className="text-sm text-orange-600 mt-1">
                          +₹{(roomSelection.extraBeds * extraBedPricePerNight * nights).toLocaleString()} for {roomSelection.extraBeds} extra bed{roomSelection.extraBeds > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Summary */}
      {totalRoomsSelected > 0 && (
        <Card className="mb-6 border-2 border-brand-orange">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-brand-orange">{totalRoomsSelected}</p>
                <p className="text-sm text-gray-600">Room{totalRoomsSelected > 1 ? 's' : ''} Selected</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-brand-orange">₹{totalCost.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Cost ({nights} night{nights > 1 ? 's' : ''})</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {selectedRooms.filter(room => room.quantity > 0).map(room => (
                <div key={room.category.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{room.quantity} × {room.category.name}</span>
                    <span>₹{(room.quantity * parseFloat(room.category.price) * nights).toLocaleString()}</span>
                  </div>
                  {room.extraBeds > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 pl-4">
                      <span>+ {room.extraBeds} extra bed{room.extraBeds > 1 ? 's' : ''}</span>
                      <span>₹{(room.extraBeds * extraBedPricePerNight * nights).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!hasValidSelection && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-yellow-800 text-sm">
                  {totalCapacity < availabilityData.totalGuests 
                    ? `Your selected rooms can accommodate ${totalCapacity} guests, but you need space for ${availabilityData.totalGuests} guests. Please select more rooms.`
                    : 'Please select at least one room to proceed.'
                  }
                </p>
              </div>
            )}

            <Button 
              onClick={handleProceedToBooking}
              disabled={!hasValidSelection}
              className="w-full bg-brand-orange hover:bg-orange-600"
            >
              Proceed to Guest Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}