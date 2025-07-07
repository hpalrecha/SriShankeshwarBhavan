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
  roomCategoryId: z.string().min(1, "Room category is required"),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      checkinDate: "",
      checkoutDate: "",
      roomCategoryId: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/rooms/availability?checkinDate=${values.checkinDate}&checkoutDate=${values.checkoutDate}&roomCategoryId=${values.roomCategoryId}`
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

      onSearch(
        {
          checkinDate: values.checkinDate,
          checkoutDate: values.checkoutDate,
          roomCategoryId: parseInt(values.roomCategoryId),
        },
        availability
      );

      toast({
        title: "Rooms found!",
        description: `${availability.availableUnits} rooms available for your dates.`,
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="roomCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Room Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} - ₹{category.price}/night
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
