import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Users, Phone, Mail } from "lucide-react";
import type { RoomCategory } from "@shared/schema";

const adminBookingSchema = z.object({
  guestName: z.string().min(2, "Guest name is required"),
  guestEmail: z.string().email("Valid email is required"),
  guestMobile: z.string().min(10, "Valid mobile number is required"),
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  roomCategoryId: z.string().min(1, "Room category is required"),
  guests: z.number().min(1, "At least 1 guest required"),
  paymentMethod: z.enum(["online", "checkin"]),
});

type AdminBookingFormData = z.infer<typeof adminBookingSchema>;

export default function AdminBookingForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const form = useForm<AdminBookingFormData>({
    resolver: zodResolver(adminBookingSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestMobile: "",
      checkinDate: "",
      checkoutDate: "",
      roomCategoryId: "",
      guests: 2,
      paymentMethod: "checkin",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: AdminBookingFormData) => {
      const response = await apiRequest("POST", "/api/bookings", {
        user: {
          name: data.guestName,
          email: data.guestEmail,
          mobile: data.guestMobile,
        },
        booking: {
          checkinDate: data.checkinDate,
          checkoutDate: data.checkoutDate,
          roomCategoryId: parseInt(data.roomCategoryId),
          guests: data.guests,
          paymentMethod: data.paymentMethod,
          status: "confirmed",
        },
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      form.reset();
      toast({
        title: "Booking created successfully",
        description: `Booking ID: ${data.bookingId}`,
      });
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminBookingFormData) => {
    setIsSubmitting(true);
    createBookingMutation.mutate(data);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create New Booking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guest Name
              </Label>
              <Input
                id="guestName"
                {...form.register("guestName")}
                placeholder="Enter guest name"
              />
              {form.formState.errors.guestName && (
                <p className="text-sm text-red-600">{form.formState.errors.guestName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="guestEmail"
                type="email"
                {...form.register("guestEmail")}
                placeholder="guest@example.com"
              />
              {form.formState.errors.guestEmail && (
                <p className="text-sm text-red-600">{form.formState.errors.guestEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestMobile" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Number
              </Label>
              <Input
                id="guestMobile"
                {...form.register("guestMobile")}
                placeholder="+91 98765 43210"
              />
              {form.formState.errors.guestMobile && (
                <p className="text-sm text-red-600">{form.formState.errors.guestMobile.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Number of Guests</Label>
              <Input
                id="guests"
                type="number"
                min="1"
                max="10"
                {...form.register("guests", { valueAsNumber: true })}
              />
              {form.formState.errors.guests && (
                <p className="text-sm text-red-600">{form.formState.errors.guests.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkinDate">Check-in Date</Label>
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
              <Label htmlFor="checkoutDate">Check-out Date</Label>
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
              <Label htmlFor="roomCategoryId">Room Category</Label>
              <Select onValueChange={(value) => form.setValue("roomCategoryId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name} - ₹{category.price} (Max {category.maxOccupancy || 2} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.roomCategoryId && (
                <p className="text-sm text-red-600">{form.formState.errors.roomCategoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select onValueChange={(value) => form.setValue("paymentMethod", value as "online" | "checkin")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkin">Pay at Check-in</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-brand-orange hover:bg-orange-600"
            disabled={isSubmitting || createBookingMutation.isPending}
          >
            {isSubmitting || createBookingMutation.isPending ? "Creating Booking..." : "Create Booking"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}