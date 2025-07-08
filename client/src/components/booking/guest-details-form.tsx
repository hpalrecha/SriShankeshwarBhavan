import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BookingFormData, RoomAvailability, GuestFormData } from "@/lib/types";

const guestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  paymentMethod: z.enum(["online", "checkin"], {
    required_error: "Please select a payment method",
  }),
});

interface GuestDetailsFormProps {
  bookingData: BookingFormData;
  availabilityData: RoomAvailability;
  onCancel: () => void;
}

export default function GuestDetailsForm({ bookingData, availabilityData, onCancel }: GuestDetailsFormProps) {
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");

  const form = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      paymentMethod: "checkin",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: { user: GuestFormData; booking: any }) => {
      return await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setBookingId(result.bookingId);
      setShowConfirmation(true);
      toast({
        title: "Booking Confirmed!",
        description: `Your booking ID is ${result.bookingId}`,
      });
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate booking details
  const checkinDate = new Date(bookingData.checkinDate);
  const checkoutDate = new Date(bookingData.checkoutDate);
  const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalAmount = parseFloat(availabilityData.category.price) * nights;

  const onSubmit = (values: z.infer<typeof guestSchema>) => {
    createBookingMutation.mutate({
      user: values,
      booking: {
        roomCategoryId: bookingData.roomCategoryId,
        checkinDate: bookingData.checkinDate,
        checkoutDate: bookingData.checkoutDate,
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentMethod === "online" ? "pending" : "unpaid",
        totalAmount: totalAmount.toString(),
        status: "confirmed",
        isAutoBooking: false,
      },
    });
  };

  const handleCloseModal = () => {
    setShowConfirmation(false);
    onCancel();
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Guest Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Option</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="online" id="online" />
                          <Label htmlFor="online">Pay Online</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="checkin" id="checkin" />
                          <Label htmlFor="checkin">Pay at Check-in</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Room Category:</span>
                    <span className="font-medium">{availabilityData.category.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-in:</span>
                    <span>{new Date(bookingData.checkinDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-out:</span>
                    <span>{new Date(bookingData.checkoutDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Number of nights:</span>
                    <span>{nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per night:</span>
                    <span>₹{availabilityData.category.price}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total Amount:</span>
                    <span className="text-brand-orange">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-light"
                  disabled={createBookingMutation.isPending}
                >
                  {createBookingMutation.isPending ? "Creating Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Booking Confirmed!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Your room has been successfully booked.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900">
                Booking ID: <span className="text-brand-orange">{bookingId}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">Check your email for booking details</p>
            </div>
            <Button onClick={handleCloseModal} className="w-full bg-brand-orange hover:bg-brand-orange-light">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
