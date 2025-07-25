import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, User, MapPin, Utensils, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookingFormData, RoomAvailability, GuestFormData, FoodSettings } from "@/lib/types";
import BookingPayment from "@/components/BookingPayment";

const guestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  // Address fields
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().default("India"),

  estimatedArrivalTime: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
  // Food options
  breakfastDays: z.number().default(0),
  lunchDays: z.number().default(0),
  dinnerDays: z.number().default(0),
  paymentMethod: z.enum(["pay_at_checkin", "pay_online"], {
    required_error: "Please select a payment method",
  }),
});

interface GuestDetailsFormProps {
  bookingData: BookingFormData;
  availabilityData: RoomAvailability | any;
  onCancel: () => void;
}

export default function GuestDetailsForm({ bookingData, availabilityData, onCancel }: GuestDetailsFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const [bookingFor, setBookingFor] = useState<"self" | "others">("others");

  // Check if user is authenticated
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Fetch food settings for pricing
  const { data: foodSettings } = useQuery<FoodSettings>({
    queryKey: ["/api/admin/food-settings"],
    retry: false,
  });

  const form = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      estimatedArrivalTime: "",
      estimatedDepartureTime: "",
      breakfastDays: 0,
      lunchDays: 0,
      dinnerDays: 0,
      paymentMethod: "pay_at_checkin",
    },
  });

  // Auto-populate form when user is logged in and booking for self
  useEffect(() => {
    if (currentUser && typeof currentUser === 'object' && 'name' in currentUser && bookingFor === "self") {
      form.reset({
        name: (currentUser as any).name || "",
        email: (currentUser as any).email || "",
        mobile: (currentUser as any).mobile || "",
        address: (currentUser as any).address || "",
        city: (currentUser as any).city || "",
        state: (currentUser as any).state || "",
        pincode: (currentUser as any).pincode || "",
        country: (currentUser as any).country || "India",
        estimatedArrivalTime: "",
        estimatedDepartureTime: "",
        breakfastDays: 0,
        lunchDays: 0,
        dinnerDays: 0,
        paymentMethod: "pay_at_checkin",
      });
    } else if (bookingFor === "others") {
      form.reset({
        name: "",
        email: "",
        mobile: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        estimatedArrivalTime: "",
        estimatedDepartureTime: "",
        breakfastDays: 0,
        lunchDays: 0,
        dinnerDays: 0,
        paymentMethod: "pay_at_checkin",
      });
    }
  }, [currentUser, bookingFor, form]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: { user: GuestFormData; booking: any }) => {
      return await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setBookingId(result.bookingId);
      
      // Invalidate caches for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-bookings"] });
      
      // Show payment step instead of going directly to confirmation
      setShowPayment(true);
      
      // If user was auto-logged in, invalidate auth cache
      if (result.autoLoggedIn) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({
          title: "Account Created & Logged In",
          description: `Welcome! Your account has been created with the password: guest123`,
        });
      }
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
  
  // Handle both single room and multiple room selections
  const totalAmount = availabilityData.totalCost || 
    (parseFloat(availabilityData.category?.price || "0") * nights * (availabilityData.roomsNeeded || 1));
  
  const primaryCategory = availabilityData.category || availabilityData.selectedRooms?.[0]?.category;

  const onSubmit = (values: z.infer<typeof guestSchema>) => {
    // Calculate food costs
    const breakfastPrice = parseFloat(foodSettings?.breakfastPrice || "50");
    const lunchPrice = parseFloat(foodSettings?.lunchPrice || "100");
    const dinnerPrice = parseFloat(foodSettings?.dinnerPrice || "100");
    
    const foodAmount = (values.breakfastDays * breakfastPrice) + 
                      (values.lunchDays * lunchPrice) + 
                      (values.dinnerDays * dinnerPrice);
    
    const roomAmount = totalAmount;
    const finalTotalAmount = roomAmount + foodAmount;

    createBookingMutation.mutate({
      user: values,
      booking: {
        roomCategoryId: primaryCategory?.id || 0,
        checkinDate: bookingData.checkinDate,
        checkoutDate: bookingData.checkoutDate,
        guests: bookingData.guests,

        estimatedArrivalTime: values.estimatedArrivalTime,
        estimatedDepartureTime: values.estimatedDepartureTime,
        // Food options
        breakfastDays: values.breakfastDays,
        lunchDays: values.lunchDays,
        dinnerDays: values.dinnerDays,
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentMethod === "pay_online" ? "pending" : "unpaid",
        totalAmount: finalTotalAmount.toString(),
        status: "confirmed",
        isAutoBooking: false,
        roomsBooked: availabilityData.totalRoomsSelected || availabilityData.roomsNeeded || 1,
      },
    });
  };

  const handleCloseModal = () => {
    setShowConfirmation(false);
    form.reset();
    onCancel();
  };

  const navigateToMyBookings = () => {
    setShowConfirmation(false);
    setLocation('/dashboard');
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful!",
      description: `Your booking is confirmed with ID: ${bookingId}`,
    });
    setShowPayment(false);
    setShowConfirmation(true);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Calculate total amount including food
  const calculateTotalAmount = () => {
    const breakfastPrice = parseFloat(foodSettings?.breakfastPrice || "50");
    const lunchPrice = parseFloat(foodSettings?.lunchPrice || "100");
    const dinnerPrice = parseFloat(foodSettings?.dinnerPrice || "100");
    
    const foodAmount = (form.watch('breakfastDays') * breakfastPrice) + 
                      (form.watch('lunchDays') * lunchPrice) + 
                      (form.watch('dinnerDays') * dinnerPrice);
    
    const roomAmount = totalAmount;
    return roomAmount + foodAmount;
  };

  // If payment step is showing, render payment component
  if (showPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <BookingPayment
          bookingId={bookingId}
          totalAmount={calculateTotalAmount()}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Guest Details
          </CardTitle>
          
          {/* Book for Self/Others Selection - Only show if user is logged in */}
          {currentUser && typeof currentUser === 'object' && 'name' in currentUser && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Who are you booking for?
              </Label>
              <RadioGroup 
                value={bookingFor} 
                onValueChange={(value: "self" | "others") => setBookingFor(value)}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="text-sm cursor-pointer">
                    For Myself
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="others" id="others" />
                  <Label htmlFor="others" className="text-sm cursor-pointer">
                    For Someone Else
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
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

              {/* Address Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <MapPin className="h-4 w-4" />
                  <h4>Address Details</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter complete address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="Pincode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Travel Timing Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Clock className="h-4 w-4" />
                  <h4>Travel Timing (Optional)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedArrivalTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Arrival Time (ETA)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            placeholder="Select arrival time"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedDepartureTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Departure Time (ETD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            placeholder="Select departure time"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Food Options Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Utensils className="h-4 w-4" />
                  <h4>Food Options (Optional)</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Select the number of meal coupons you would like to purchase. You can order any quantity. Food donations will be added to your total.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="breakfastDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Breakfast Coupons 
                          <span className="text-sm text-gray-500 ml-1">
                            (₹{foodSettings?.breakfastPrice || "50"}/coupon)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="Enter number of breakfast coupons"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lunchDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Lunch Coupons 
                          <span className="text-sm text-gray-500 ml-1">
                            (₹{foodSettings?.lunchPrice || "100"}/coupon)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="Enter number of lunch coupons"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dinnerDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Dinner Coupons 
                          <span className="text-sm text-gray-500 ml-1">
                            (₹{foodSettings?.dinnerPrice || "100"}/coupon)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="Enter number of dinner coupons"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
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
                  {/* Room Selection Summary */}
                  {availabilityData.selectedRooms ? (
                    <div className="space-y-2">
                      <div className="flex justify-between font-medium">
                        <span>Selected Rooms:</span>
                        <span>{availabilityData.totalRoomsSelected} room{availabilityData.totalRoomsSelected > 1 ? 's' : ''}</span>
                      </div>
                      {availabilityData.selectedRooms.map((room: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm pl-4">
                          <span>{room.quantity} × {room.category.name}</span>
                          <span>₹{(room.quantity * parseFloat(room.category.price) * nights).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Room Category:</span>
                      <span className="font-medium">{primaryCategory?.name || 'Room'}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Total Guests:</span>
                    <span className="font-medium">{bookingData.guests}</span>
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
                  {/* Food Summary */}
                  {(form.watch('breakfastDays') > 0 || form.watch('lunchDays') > 0 || form.watch('dinnerDays') > 0) && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="font-medium text-gray-900">Food Options:</div>
                      {form.watch('breakfastDays') > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span>Breakfast × {form.watch('breakfastDays')} coupons</span>
                          <span>₹{(form.watch('breakfastDays') * parseFloat(foodSettings?.breakfastPrice || "50")).toLocaleString()}</span>
                        </div>
                      )}
                      {form.watch('lunchDays') > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span>Lunch × {form.watch('lunchDays')} coupons</span>
                          <span>₹{(form.watch('lunchDays') * parseFloat(foodSettings?.lunchPrice || "100")).toLocaleString()}</span>
                        </div>
                      )}
                      {form.watch('dinnerDays') > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span>Dinner × {form.watch('dinnerDays')} coupons</span>
                          <span>₹{(form.watch('dinnerDays') * parseFloat(foodSettings?.dinnerPrice || "100")).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total Donation:</span>
                    <span className="text-brand-orange">
                      ₹{(() => {
                        const roomAmount = totalAmount;
                        const foodAmount = (form.watch('breakfastDays') * parseFloat(foodSettings?.breakfastPrice || "50")) + 
                                          (form.watch('lunchDays') * parseFloat(foodSettings?.lunchPrice || "100")) + 
                                          (form.watch('dinnerDays') * parseFloat(foodSettings?.dinnerPrice || "100"));
                        return (roomAmount + foodAmount).toLocaleString();
                      })()}
                    </span>
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
            <div className="flex space-x-3">
              <Button onClick={handleCloseModal} variant="outline" className="flex-1">
                Close
              </Button>
              <Button onClick={navigateToMyBookings} className="flex-1 bg-brand-orange hover:bg-brand-orange-light">
                View My Bookings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
