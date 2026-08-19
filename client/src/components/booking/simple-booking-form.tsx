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
import { smoothScrollToSection } from "@/lib/scroll-utils";
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
      // Check availability for all room categories
      const availabilityPromises = roomCategories.map(async (category) => {
        const response = await fetch(
          `/api/rooms/availability?checkinDate=${values.checkinDate}&checkoutDate=${values.checkoutDate}&roomCategoryId=${category.id}`
        );
        if (response.ok) {
          const availability = await response.json();
          return { ...availability, category };
        }
        return null;
      });

      const allAvailabilities = await Promise.all(availabilityPromises);
      const availableRooms = allAvailabilities.filter(avail => avail && avail.available);

      if (availableRooms.length === 0) {
        toast({
          title: "No rooms available",
          description: "No rooms are available for the selected dates. Please try different dates.",
          variant: "destructive",
        });
      } else {
        // Pass all available rooms to the results component
        onSearch(values, { 
          availableRooms,
          totalGuests: values.guests 
        } as any);
        
        toast({
          title: "Rooms found!",
          description: `${availableRooms.length} room type${availableRooms.length > 1 ? 's' : ''} available for your dates.`,
        });
        
        // Scroll to room results after a brief delay
        setTimeout(() => {
          smoothScrollToSection("room-results");
        }, 100);
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
                max={(() => {
                  const maxDate = new Date();
                  maxDate.setFullYear(maxDate.getFullYear() + 1);
                  return maxDate.toISOString().split('T')[0];
                })()}
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
                max={(() => {
                  const maxDate = new Date();
                  maxDate.setFullYear(maxDate.getFullYear() + 1);
                  return maxDate.toISOString().split('T')[0];
                })()}
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
          
          {/* Bulk Booking Button */}
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-3 text-center">
              Need more than 15 rooms? Let us help you with bulk booking!
            </p>
            <Button 
              type="button"
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => {
                const message = encodeURIComponent("We want to book rooms in bulk in your bhavan.");
                window.open(`https://wa.me/919902123456?text=${message}`, '_blank');
              }}
            >
              Contact for Bulk Booking (15+ Rooms)
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}