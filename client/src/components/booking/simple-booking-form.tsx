import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users } from "lucide-react";
import type { RoomCategory } from "@shared/schema";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

const formSchema = z.object({
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  guests: z.number().min(1, "At least 1 guest required").max(10, "Maximum 10 guests allowed"),
});

interface SimpleBookingFormProps {
  onSearch: (data: BookingFormData, availability: RoomAvailability) => void;
}

export default function SimpleBookingForm({ onSearch }: SimpleBookingFormProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      checkinDate: "",
      checkoutDate: "",
      guests: 2,
    },
  });

  const onSubmit = async (values: BookingFormData) => {
    setIsSearching(true);
    try {
      // Find the best available room category for the guest count
      let bestCategory = roomCategories.find(cat => (cat.maxOccupancy || 2) >= values.guests);
      
      // If no single room can accommodate all guests, find the largest room
      if (!bestCategory && roomCategories.length > 0) {
        bestCategory = roomCategories.reduce((prev, current) => 
          ((current.maxOccupancy || 2) > (prev.maxOccupancy || 2)) ? current : prev
        );
      }
      
      if (!bestCategory) {
        toast({
          title: "No suitable rooms",
          description: "No rooms available for the selected guest count.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const response = await fetch(
        `/api/rooms/availability?checkinDate=${values.checkinDate}&checkoutDate=${values.checkoutDate}&roomCategoryId=${bestCategory.id}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to check availability");
      }

      const availability: RoomAvailability = await response.json();
      
      // Calculate how many rooms are needed for the guest count
      const maxOccupancy = bestCategory.maxOccupancy || 2;
      const roomsNeeded = Math.ceil(values.guests / maxOccupancy);
      
      if (!availability.available || availability.availableUnits < roomsNeeded) {
        const availableMessage = roomsNeeded > 1 
          ? `${roomsNeeded} rooms needed but only ${availability.availableUnits || 0} available.`
          : "No rooms are available for the selected dates.";
          
        toast({
          title: "Insufficient availability",
          description: availableMessage + " Please try different dates.",
          variant: "destructive",
        });
      } else {
        // Add rooms needed info to availability data
        const enhancedAvailability = {
          ...availability,
          roomsNeeded,
          guestsPerRoom: Math.ceil(values.guests / roomsNeeded)
        };
        
        onSearch(values, enhancedAvailability);
        
        const successMessage = roomsNeeded > 1 
          ? `${roomsNeeded} rooms available for ${values.guests} guests!`
          : `Room available for ${values.guests} guest${values.guests > 1 ? 's' : ''}!`;
          
        toast({
          title: "Rooms found!",
          description: successMessage,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search for available rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Book Your Stay</h3>
            <p className="text-gray-600">Enter your dates and guest count to find available rooms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkinDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Check-in Date
              </Label>
              <Input
                id="checkinDate"
                type="date"
                {...form.register("checkinDate")}
                min={new Date().toISOString().split('T')[0]}
              />
              {form.formState.errors.checkinDate && (
                <p className="text-sm text-red-600">{form.formState.errors.checkinDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkoutDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Check-out Date
              </Label>
              <Input
                id="checkoutDate"
                type="date"
                {...form.register("checkoutDate")}
                min={new Date().toISOString().split('T')[0]}
              />
              {form.formState.errors.checkoutDate && (
                <p className="text-sm text-red-600">{form.formState.errors.checkoutDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guests
              </Label>
              <Input
                id="guests"
                type="number"
                min="1"
                max="10"
                placeholder="2"
                {...form.register("guests", { valueAsNumber: true })}
              />
              {form.formState.errors.guests && (
                <p className="text-sm text-red-600">{form.formState.errors.guests.message}</p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-brand-orange hover:bg-orange-600 text-white font-semibold py-3"
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search Available Rooms"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}