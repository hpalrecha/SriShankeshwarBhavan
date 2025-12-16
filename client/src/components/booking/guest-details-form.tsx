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
import { CheckCircle, User, MapPin, Utensils, Clock, Bed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookingFormData, RoomAvailability, GuestFormData, FoodSettings } from "@/lib/types";
import BookingPayment from "@/components/BookingPayment";

const createGuestSchema = (maxGuests: number) => z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  mobile: z.string().min(10, "Valid mobile number is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  roomsToBook: z.number()
    .min(1, "At least 1 room required")
    .max(maxGuests, `Cannot book more than ${maxGuests} room${maxGuests === 1 ? '' : 's'} for ${maxGuests} guest${maxGuests === 1 ? '' : 's'}`),
  estimatedArrivalTime: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
  // Food options
  breakfastDays: z.number().default(0),
  lunchDays: z.number().default(0),
  dinnerDays: z.number().default(0),
  // Extra bed option
  extraBeds: z.number().default(0),
  paymentMethod: z.enum(["pay_at_checkin", "pay_online"], {
    required_error: "Please select a payment method",
  }),
});

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", 
  "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry"
];

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
  const [formData, setFormData] = useState<any>(null);
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

  const guestSchema = createGuestSchema(bookingData.guests);
  type GuestSchemaType = z.infer<typeof guestSchema>;
  const form = useForm<GuestSchemaType>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      state: "",
      roomsToBook: availabilityData.totalRoomsSelected || availabilityData.roomsNeeded || 1,
      estimatedArrivalTime: "",
      estimatedDepartureTime: "",
      breakfastDays: 0,
      lunchDays: 0,
      dinnerDays: 0,
      extraBeds: availabilityData.totalExtraBeds || 0,
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
        city: (currentUser as any).city || "",
        state: (currentUser as any).state || "",
        roomsToBook: availabilityData.totalRoomsSelected || availabilityData.roomsNeeded || 1,
        estimatedArrivalTime: "",
        estimatedDepartureTime: "",
        breakfastDays: 0,
        lunchDays: 0,
        dinnerDays: 0,
        extraBeds: availabilityData.totalExtraBeds || 0,
        paymentMethod: "pay_at_checkin",
      });
    } else if (bookingFor === "others") {
      form.reset({
        name: "",
        email: "",
        mobile: "",
        city: "",
        state: "",
        roomsToBook: availabilityData.totalRoomsSelected || availabilityData.roomsNeeded || 1,
        estimatedArrivalTime: "",
        estimatedDepartureTime: "",
        breakfastDays: 0,
        lunchDays: 0,
        dinnerDays: 0,
        extraBeds: availabilityData.totalExtraBeds || 0,
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
      
      // If payment method is pay_at_checkin, go directly to confirmation
      if (form.getValues('paymentMethod') === 'pay_at_checkin') {
        setShowConfirmation(true);
      } else {
        // For online payment, show payment step
        setShowPayment(true);
      }
      
      // Always invalidate auth cache after booking to refresh login status
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Show success message for new accounts
      if (result.autoLoggedIn && result.defaultPassword) {
        setTimeout(() => {
          toast({
            title: "Account Created & Logged In",
            description: `Welcome! Your account has been created with password: guest123`,
          });
        }, 1500);
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
  const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Handle both single room and multiple room selections
  const selectedRooms = form.watch('roomsToBook') || availabilityData.roomsNeeded || 1;
  const totalAmount = availabilityData.totalCost || 
    (parseFloat(availabilityData.category?.price || "0") * nights * selectedRooms);
  
  const primaryCategory = availabilityData.category || availabilityData.selectedRooms?.[0]?.category;

  const onSubmit = (values: GuestSchemaType) => {
    console.log("Form submitted with values:", values);
    console.log("Payment method selected:", values.paymentMethod);
    
    // CRITICAL: Double-check room validation before proceeding
    if (values.roomsToBook > bookingData.guests) {
      toast({
        title: "Invalid Room Selection",
        description: `Cannot book ${values.roomsToBook} rooms for ${bookingData.guests} guest${bookingData.guests === 1 ? '' : 's'}. Maximum allowed: ${bookingData.guests} room${bookingData.guests === 1 ? '' : 's'}.`,
        variant: "destructive",
      });
      
      // Force reset the room selection to maximum allowed
      form.setValue('roomsToBook', bookingData.guests);
      return; // STOP submission completely
    }
    
    // Store form data for later use
    setFormData(values);
    
    if (values.paymentMethod === 'pay_online') {
      console.log("Setting showPayment to true for online payment");
      // For online payment, go to payment first (don't create booking yet)
      setShowPayment(true);
    } else {
      console.log("Creating booking directly for pay at checkin");
      // For pay at checkin, create booking directly
      createBookingFromFormData(values);
    }
  };

  const createBookingFromFormData = (values: GuestSchemaType) => {
    // Calculate food costs
    const breakfastPrice = parseFloat(foodSettings?.breakfastPrice || "50");
    const lunchPrice = parseFloat(foodSettings?.lunchPrice || "100");
    const dinnerPrice = parseFloat(foodSettings?.dinnerPrice || "100");
    
    const foodAmount = (values.breakfastDays * breakfastPrice) + 
                      (values.lunchDays * lunchPrice) + 
                      (values.dinnerDays * dinnerPrice);
    
    // Calculate extra bed costs (₹200 per bed per night)
    const extraBedPricePerNight = 200;
    const extraBedAmount = (values.extraBeds || 0) * extraBedPricePerNight * nights;
    
    const roomAmount = totalAmount;
    const finalTotalAmount = roomAmount + foodAmount + extraBedAmount;

    createBookingMutation.mutate({
      user: values,
      booking: {
        roomCategoryId: primaryCategory?.id || 0,
        checkinDate: bookingData.checkinDate,
        checkoutDate: bookingData.checkoutDate,
        guests: bookingData.guests,
        estimatedArrivalTime: values.estimatedArrivalTime,
        estimatedDepartureTime: values.estimatedDepartureTime,
        breakfastDays: values.breakfastDays,
        lunchDays: values.lunchDays,
        dinnerDays: values.dinnerDays,
        extraBeds: values.extraBeds || 0,
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentMethod === "pay_online" ? "paid" : "unpaid",
        totalAmount: finalTotalAmount.toString(),
        status: "confirmed",
        isAutoBooking: false,
        roomsBooked: values.roomsToBook,
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
    setLocation('/my-bookings');
  };

  const handlePaymentSuccess = () => {
    // Payment successful, now create the booking
    if (formData) {
      createBookingFromFormData(formData);
    }
    setShowPayment(false);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Calculate total amount including food and extra beds
  const calculateTotalAmount = () => {
    const breakfastPrice = parseFloat(foodSettings?.breakfastPrice || "50");
    const lunchPrice = parseFloat(foodSettings?.lunchPrice || "100");
    const dinnerPrice = parseFloat(foodSettings?.dinnerPrice || "100");
    
    const foodAmount = (form.watch('breakfastDays') * breakfastPrice) + 
                      (form.watch('lunchDays') * lunchPrice) + 
                      (form.watch('dinnerDays') * dinnerPrice);
    
    // Calculate extra bed costs (₹200 per bed per night)
    const extraBedPricePerNight = 200;
    const extraBedAmount = (form.watch('extraBeds') || 0) * extraBedPricePerNight * nights;
    
    const roomAmount = totalAmount;
    return roomAmount + foodAmount + extraBedAmount;
  };

  // If payment step is showing, render payment component
  if (showPayment && formData && formData.paymentMethod === 'pay_online') {
    console.log("Rendering payment component with:", {
      showPayment,
      formData: !!formData,
      paymentMethod: formData.paymentMethod,
      totalAmount: calculateTotalAmount()
    });
    return (
      <div className="max-w-2xl mx-auto">
        <BookingPayment
          formData={formData}
          bookingData={bookingData}
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
          {currentUser && (currentUser as any).name && (
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
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Enter mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <MapPin className="h-4 w-4" />
                  <h4>Location Details</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {indianStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Room Selection Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Bed className="h-4 w-4" />
                  <h4>Room Selection</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="roomsToBook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Number of Rooms *
                        <span className="text-sm text-gray-500 ml-2">
                          (Maximum: {bookingData.guests} room{bookingData.guests === 1 ? '' : 's'} for {bookingData.guests} guest{bookingData.guests === 1 ? '' : 's'})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={bookingData.guests}
                          value={field.value}
                          onChange={(e) => {
                            let value = parseInt(e.target.value) || 1;
                            // Strict validation: Force value to be within valid range
                            if (value > bookingData.guests) {
                              value = bookingData.guests;
                              toast({
                                title: "Room Limit Reached",
                                description: `Maximum ${bookingData.guests} room${bookingData.guests === 1 ? '' : 's'} allowed for ${bookingData.guests} guest${bookingData.guests === 1 ? '' : 's'}.`,
                                variant: "destructive",
                              });
                            }
                            if (value < 1) {
                              value = 1;
                            }
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            // Additional validation on blur to catch any bypassed values
                            let value = parseInt(e.target.value) || 1;
                            if (value > bookingData.guests) {
                              value = bookingData.guests;
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-600">
                        Each {primaryCategory?.name || "room"} can accommodate up to {primaryCategory?.maxOccupancy || 2} guests.
                        {availabilityData.roomsNeeded && availabilityData.roomsNeeded > 1 && 
                          ` We recommend ${availabilityData.roomsNeeded} rooms for ${bookingData.guests} guests.`
                        }
                      </p>
                      {form.watch('roomsToBook') > bookingData.guests && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                          <p className="text-sm text-red-700 font-medium">
                            ⚠️ Cannot book {form.watch('roomsToBook')} rooms for {bookingData.guests} guest{bookingData.guests === 1 ? '' : 's'}. 
                            Maximum allowed: {bookingData.guests} room{bookingData.guests === 1 ? '' : 's'}.
                          </p>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
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

              {/* Extra Bed Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Bed className="h-4 w-4" />
                  <h4>Extra Bed (Optional)</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Need additional beds? Extra beds are available at ₹200 per bed per night. Maximum beds vary by room type.
                </p>
                
                <FormField
                  control={form.control}
                  name="extraBeds"
                  render={({ field }) => {
                    // Use backend-provided extraBedMax from room category (default to 1 if not set)
                    const maxExtraBeds = primaryCategory?.extraBedMax ?? 1;
                    const roomsSelected = form.watch('roomsToBook') || 1;
                    const totalMaxBeds = maxExtraBeds * roomsSelected;
                    
                    // If no extra beds allowed for this category, show a disabled state
                    if (maxExtraBeds === 0) {
                      return (
                        <FormItem className="max-w-xs">
                          <FormLabel className="text-gray-500">Number of Extra Beds</FormLabel>
                          <p className="text-sm text-gray-500">
                            Extra beds are not available for this room type.
                          </p>
                        </FormItem>
                      );
                    }
                    
                    return (
                      <FormItem className="max-w-xs">
                        <FormLabel>
                          Number of Extra Beds
                          <span className="text-sm text-gray-500 ml-1">
                            (₹200/bed/night × {nights} night{nights > 1 ? 's' : ''})
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max={totalMaxBeds}
                            placeholder="0"
                            data-testid="input-extra-beds"
                            {...field} 
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              field.onChange(Math.min(value, totalMaxBeds));
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Maximum {totalMaxBeds} extra bed{totalMaxBeds !== 1 ? 's' : ''} for {roomsSelected} room{roomsSelected !== 1 ? 's' : ''} ({maxExtraBeds} per room)
                        </p>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
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
                          <RadioGroupItem value="pay_online" id="pay_online" />
                          <Label htmlFor="pay_online">Pay Online</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pay_at_checkin" id="pay_at_checkin" />
                          <Label htmlFor="pay_at_checkin">Pay at Check-in</Label>
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
                    <span>Rooms Selected:</span>
                    <span className="font-medium">{selectedRooms}</span>
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
                  
                  {/* Extra Bed Summary */}
                  {(form.watch('extraBeds') || 0) > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="font-medium text-gray-900">Extra Beds:</div>
                      <div className="flex justify-between text-sm pl-4">
                        <span>{form.watch('extraBeds')} extra bed{form.watch('extraBeds') > 1 ? 's' : ''} × {nights} night{nights > 1 ? 's' : ''}</span>
                        <span>₹{((form.watch('extraBeds') || 0) * 200 * nights).toLocaleString()}</span>
                      </div>
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
                        const extraBedAmount = (form.watch('extraBeds') || 0) * 200 * nights;
                        return (roomAmount + foodAmount + extraBedAmount).toLocaleString();
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
                  disabled={
                    createBookingMutation.isPending || 
                    (form.watch('roomsToBook') > bookingData.guests) ||
                    !form.formState.isValid
                  }
                >
                  {createBookingMutation.isPending ? "Creating Booking..." : 
                   (form.watch('roomsToBook') > bookingData.guests) ? "Invalid Room Selection" :
                   "Confirm Booking"}
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
