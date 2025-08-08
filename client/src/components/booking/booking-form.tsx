import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory } from "@shared/schema";
import type { BookingFormData, RoomAvailability } from "@/lib/types";

const formSchema = z.object({
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  guests: z.number().min(1, "At least 1 guest required").max(10, "Maximum 10 guests allowed"),
}).refine((data) => {
  if (!data.checkinDate || !data.checkoutDate) return true; // Let required validation handle empty fields
  const checkin = new Date(data.checkinDate);
  const checkout = new Date(data.checkoutDate);
  return checkout >= checkin;
}, {
  message: "Check-out date must be on or after check-in date",
  path: ["checkoutDate"],
});

interface BookingFormProps {
  onSearch: (data: BookingFormData, availability: RoomAvailability) => void;
}

export default function BookingForm({ onSearch }: BookingFormProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);

  const { data: roomCategories, isLoading } = useQuery<RoomCategory[]>({
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
      // CRITICAL: Check date validity before proceeding
      const checkinDate = new Date(values.checkinDate);
      const checkoutDate = new Date(values.checkoutDate);
      
      // ABSOLUTE VALIDATION: Prevent any submission with invalid dates
      if (!values.checkinDate || !values.checkoutDate) {
        toast({
          title: "Missing Dates",
          description: "Please select both check-in and check-out dates.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }
      
      if (checkoutDate < checkinDate) {
        // FORCE correction and stop submission
        form.setValue('checkoutDate', values.checkinDate);
        toast({
          title: "Invalid Dates",
          description: "Check-out date cannot be before check-in date. Corrected to same day.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }
      
      if (checkoutDate.getTime() === checkinDate.getTime()) {
        console.log("Same day booking detected - will charge 1 night");
      }
      
      // Find the best available room category for the guest count
      const bestCategory = roomCategories?.find(cat => (cat.maxOccupancy || 2) >= values.guests) || roomCategories?.[0];
      
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
        `/api/rooms/availability?checkinDate=${values.checkinDate}&checkoutDate=${values.checkoutDate}&roomCategoryId=${bestCategory.id}&guests=${values.guests}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to check availability");
      }

      const availability: RoomAvailability = await response.json();
      
      if (!availability.available) {
        toast({
          title: "No rooms available",
          description: "No rooms are available for the selected dates. Please try different dates.",
          variant: "destructive",
        });
        return;
      }

      if (!availability.canAccommodateGuests) {
        toast({
          title: "Insufficient Room Capacity",
          description: `${values.guests} guests need ${availability.roomsNeeded} rooms, but only ${availability.availableUnits} rooms are available. Each ${availability.category.name} accommodates ${availability.guestsPerRoom} guests.`,
          variant: "destructive",
        });
        return;
      }

      onSearch(
        {
          checkinDate: values.checkinDate,
          checkoutDate: values.checkoutDate,
          guests: values.guests,
        },
        availability
      );

      toast({
        title: "Rooms found!",
        description: `${availability.availableUnits} rooms available. ${availability.roomsNeeded} rooms needed for ${values.guests} guests.`,
      });
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="checkinDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]} 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-update checkout date if it's before the new checkin date
                          const checkinDate = e.target.value;
                          const checkoutDate = form.getValues('checkoutDate');
                          if (checkoutDate && checkinDate && new Date(checkoutDate) < new Date(checkinDate)) {
                            form.setValue('checkoutDate', checkinDate);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkoutDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={form.watch('checkinDate') || new Date().toISOString().split('T')[0]}
                        {...field}
                        onBlur={(e) => {
                          const checkinDate = form.getValues('checkinDate');
                          const selectedCheckout = e.target.value;
                          
                          // Force checkout date to be same or after checkin date
                          if (checkinDate && selectedCheckout && new Date(selectedCheckout) < new Date(checkinDate)) {
                            form.setValue('checkoutDate', checkinDate);
                            toast({
                              title: "Invalid Date",
                              description: "Check-out date automatically set to check-in date. Cannot be before check-in.",
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="guests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Guests</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full bg-brand-orange hover:bg-brand-orange-light"
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search Available Rooms"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
