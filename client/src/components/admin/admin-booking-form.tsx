import { useState, useEffect } from "react";
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
import { Calendar, Users, Phone, Mail, Plus, Minus, MapPin, Plane, Utensils } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { RoomCategory } from "@shared/schema";

const roomSelectionSchema = z.object({
  categoryId: z.number(),
  quantity: z.number().min(0),
});

const adminBookingSchema = z.object({
  guestName: z.string().min(2, "Guest name is required"),
  guestEmail: z.string().email("Valid email is required"),
  guestMobile: z.string().min(10, "Valid mobile number is required"),
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  guests: z.number().min(1, "At least 1 guest required"),
  // Address fields
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().default("India"),
  // Travel details
  arrivingFrom: z.string().optional(),
  goingTo: z.string().optional(),
  estimatedArrivalTime: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
  // Food options
  breakfastDays: z.number().default(0),
  lunchDays: z.number().default(0),
  dinnerDays: z.number().default(0),
  roomSelections: z.array(roomSelectionSchema).refine(
    (selections) => selections.some(s => s.quantity > 0),
    "At least one room must be selected"
  ),
  paymentMethod: z.enum(["upi", "cash", "card", "bank_transfer", "checkin"]),
  paymentReference: z.string().optional(),
});

type AdminBookingFormData = z.infer<typeof adminBookingSchema>;

interface AdminBookingFormProps {
  preselectedUser?: {
    id: number;
    name: string;
    email: string;
    mobile?: string;
  } | null;
}

export default function AdminBookingForm({ preselectedUser }: AdminBookingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomSelections, setRoomSelections] = useState<Record<number, number>>({});

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  // Fetch food settings for pricing
  const { data: foodSettings } = useQuery({
    queryKey: ["/api/admin/food-settings"],
    retry: false,
  });

  // Initialize room selections when categories load
  useEffect(() => {
    if (roomCategories.length > 0 && Object.keys(roomSelections).length === 0) {
      const initialSelections: Record<number, number> = {};
      roomCategories.forEach(category => {
        initialSelections[category.id] = 0;
      });
      setRoomSelections(initialSelections);
    }
  }, [roomCategories, roomSelections]);

  const form = useForm<AdminBookingFormData>({
    resolver: zodResolver(adminBookingSchema),
    defaultValues: {
      guestName: preselectedUser?.name || "",
      guestEmail: preselectedUser?.email || "",
      guestMobile: preselectedUser?.mobile || "",
      checkinDate: "",
      checkoutDate: "",
      guests: 2,
      // Address fields
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      // Travel details
      arrivingFrom: "",
      goingTo: "",
      estimatedArrivalTime: "",
      estimatedDepartureTime: "",
      // Food options
      breakfastDays: 0,
      lunchDays: 0,
      dinnerDays: 0,
      roomSelections: [],
      paymentMethod: "cash",
      paymentReference: "",
    },
  });

  // Update form when preselected user changes
  useEffect(() => {
    if (preselectedUser) {
      form.setValue("guestName", preselectedUser.name);
      form.setValue("guestEmail", preselectedUser.email);
      if (preselectedUser.mobile) {
        form.setValue("guestMobile", preselectedUser.mobile);
      }
    }
  }, [preselectedUser, form]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: AdminBookingFormData) => {
      // Convert room selections to the format expected by API
      const roomSelectionArray = Object.entries(roomSelections)
        .filter(([_, quantity]) => quantity > 0)
        .map(([categoryId, quantity]) => ({
          categoryId: parseInt(categoryId),
          quantity
        }));

      // Calculate food costs
      const breakfastCost = (data.breakfastDays || 0) * parseFloat(foodSettings?.breakfastPrice || "0");
      const lunchCost = (data.lunchDays || 0) * parseFloat(foodSettings?.lunchPrice || "0");
      const dinnerCost = (data.dinnerDays || 0) * parseFloat(foodSettings?.dinnerPrice || "0");
      const totalFoodCost = breakfastCost + lunchCost + dinnerCost;

      const response = await apiRequest("POST", "/api/admin/bookings/combination", {
        user: {
          name: data.guestName,
          email: data.guestEmail,
          mobile: data.guestMobile,
          // Address fields
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          country: data.country,
        },
        booking: {
          checkinDate: data.checkinDate,
          checkoutDate: data.checkoutDate,
          guests: data.guests,
          // Travel details
          arrivingFrom: data.arrivingFrom,
          goingTo: data.goingTo,
          estimatedArrivalTime: data.estimatedArrivalTime,
          estimatedDepartureTime: data.estimatedDepartureTime,
          // Food options
          breakfastDays: data.breakfastDays,
          lunchDays: data.lunchDays,
          dinnerDays: data.dinnerDays,
          breakfastCost,
          lunchCost,
          dinnerCost,
          totalFoodCost,
          roomSelections: roomSelectionArray,
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference,
          status: "confirmed",
        },
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-availability"] });
      form.reset();
      setRoomSelections({});
      setIsSubmitting(false);
      toast({
        title: "Booking created successfully",
        description: `Created ${data.bookings?.length || 1} booking(s). Total amount: ₹${data.totalAmount}`,
      });
    },
    onError: (error) => {
      console.error("Booking error:", error);
      setIsSubmitting(false);
      toast({
        title: "Booking failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateRoomSelection = (categoryId: number, quantity: number) => {
    setRoomSelections(prev => ({
      ...prev,
      [categoryId]: Math.max(0, quantity)
    }));
  };

  const getTotalRooms = () => {
    return Object.values(roomSelections).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalAmount = () => {
    const checkinDate = form.watch("checkinDate");
    const checkoutDate = form.watch("checkoutDate");
    
    if (!checkinDate || !checkoutDate) return 0;
    
    const nights = Math.ceil((new Date(checkoutDate).getTime() - new Date(checkinDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return Object.entries(roomSelections).reduce((total, [categoryId, quantity]) => {
      const category = roomCategories.find(cat => cat.id === parseInt(categoryId));
      return total + (category ? category.price * quantity * nights : 0);
    }, 0);
  };

  const validateRoomCapacity = (guests: number) => {
    const totalCapacity = Object.entries(roomSelections).reduce((total, [categoryId, quantity]) => {
      const category = roomCategories.find(cat => cat.id === parseInt(categoryId));
      return total + (category ? (category.maxOccupancy || 2) * quantity : 0);
    }, 0);
    
    if (guests > totalCapacity) {
      const selectedRooms = Object.entries(roomSelections)
        .filter(([_, quantity]) => quantity > 0)
        .map(([categoryId, quantity]) => {
          const category = roomCategories.find(cat => cat.id === parseInt(categoryId));
          return `${quantity} x ${category?.name} (${category?.maxOccupancy || 2} guests each)`;
        })
        .join(', ');
      
      toast({
        title: "Insufficient Room Capacity",
        description: `${guests} guests cannot fit in selected rooms. Current capacity: ${totalCapacity} guests. Selected: ${selectedRooms}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const onSubmit = (data: AdminBookingFormData) => {
    if (getTotalRooms() === 0) {
      toast({
        title: "No rooms selected",
        description: "Please select at least one room to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate room capacity vs guests
    if (!validateRoomCapacity(data.guests)) {
      return;
    }
    
    setIsSubmitting(true);
    createBookingMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {preselectedUser ? `Create Booking for ${preselectedUser.name}` : "Create New Booking"}
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
                max="20"
                {...form.register("guests", { valueAsNumber: true })}
              />
              {form.formState.errors.guests && (
                <p className="text-sm text-red-600">{form.formState.errors.guests.message}</p>
              )}
              {/* Show capacity warning */}
              {(() => {
                const guests = form.watch("guests");
                const totalCapacity = Object.entries(roomSelections).reduce((total, [categoryId, quantity]) => {
                  const category = roomCategories.find(cat => cat.id === parseInt(categoryId));
                  return total + (category ? (category.maxOccupancy || 2) * quantity : 0);
                }, 0);
                
                if (guests > totalCapacity && totalCapacity > 0) {
                  return (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      ⚠️ {guests} guests exceed room capacity of {totalCapacity}. Please select more rooms.
                    </p>
                  );
                }
                return null;
              })()}
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

          </div>

          {/* Room Selection Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Room Selection</Label>
              {(() => {
                const totalRooms = getTotalRooms();
                const totalCapacity = Object.entries(roomSelections).reduce((total, [categoryId, quantity]) => {
                  const category = roomCategories.find(cat => cat.id === parseInt(categoryId));
                  return total + (category ? (category.maxOccupancy || 2) * quantity : 0);
                }, 0);
                const guests = form.watch("guests");
                const isCapacityExceeded = guests > totalCapacity && totalCapacity > 0;
                
                return (
                  <div className={`text-sm ${isCapacityExceeded ? 'text-red-600' : 'text-gray-600'}`}>
                    Total Rooms: {totalRooms} | Total Capacity: {totalCapacity} guests | Total Amount: ₹{getTotalAmount().toLocaleString()}
                    {isCapacityExceeded && <span className="block text-red-600 font-medium">⚠️ Insufficient capacity for {guests} guests!</span>}
                  </div>
                );
              })()}
            </div>
            
            <div className="grid gap-4">
              {roomCategories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-sm text-gray-600">
                        ₹{category.price}/night • Max {category.maxOccupancy || 2} guests • {category.totalUnits} units available
                      </p>
                      {category.description && (
                        <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateRoomSelection(category.id, (roomSelections[category.id] || 0) - 1)}
                        disabled={!roomSelections[category.id] || roomSelections[category.id] <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-12 text-center font-medium">
                        {roomSelections[category.id] || 0}
                      </span>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateRoomSelection(category.id, (roomSelections[category.id] || 0) + 1)}
                        disabled={(roomSelections[category.id] || 0) >= (category.totalUnits || 10)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Address Details Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <MapPin className="h-4 w-4" />
              <h4>Address Details (Optional)</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                {...form.register("address")}
                placeholder="Enter complete address"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  {...form.register("state")}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  {...form.register("pincode")}
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          {/* Travel Details Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Plane className="h-4 w-4" />
              <h4>Travel Details (Optional)</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrivingFrom">Arriving From</Label>
                <Input
                  id="arrivingFrom"
                  {...form.register("arrivingFrom")}
                  placeholder="City/Location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goingTo">Going To (Next Destination)</Label>
                <Input
                  id="goingTo"
                  {...form.register("goingTo")}
                  placeholder="City/Location"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedArrivalTime">Estimated Arrival Time</Label>
                <Input
                  id="estimatedArrivalTime"
                  type="datetime-local"
                  {...form.register("estimatedArrivalTime")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDepartureTime">Estimated Departure Time</Label>
                <Input
                  id="estimatedDepartureTime"
                  type="datetime-local"
                  {...form.register("estimatedDepartureTime")}
                />
              </div>
            </div>
          </div>

          {/* Food Options Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Utensils className="h-4 w-4" />
              <h4>Food Options (Optional)</h4>
            </div>
            <p className="text-sm text-gray-600">
              Select the number of meal coupons you would like to purchase. Food donations will be added to total amount.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakfastDays">
                  Breakfast Coupons 
                  <span className="text-sm text-gray-500 ml-1">
                    (₹{foodSettings?.breakfastPrice || "50"}/coupon)
                  </span>
                </Label>
                <Input
                  id="breakfastDays"
                  type="number"
                  min="0"
                  {...form.register("breakfastDays", { valueAsNumber: true })}
                  placeholder="Number of breakfast coupons"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunchDays">
                  Lunch Coupons 
                  <span className="text-sm text-gray-500 ml-1">
                    (₹{foodSettings?.lunchPrice || "100"}/coupon)
                  </span>
                </Label>
                <Input
                  id="lunchDays"
                  type="number"
                  min="0"
                  {...form.register("lunchDays", { valueAsNumber: true })}
                  placeholder="Number of lunch coupons"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dinnerDays">
                  Dinner Coupons 
                  <span className="text-sm text-gray-500 ml-1">
                    (₹{foodSettings?.dinnerPrice || "150"}/coupon)
                  </span>
                </Label>
                <Input
                  id="dinnerDays"
                  type="number"
                  min="0"
                  {...form.register("dinnerDays", { valueAsNumber: true })}
                  placeholder="Number of dinner coupons"
                />
              </div>
            </div>

            {/* Food Cost Summary */}
            {(() => {
              const breakfastDays = form.watch("breakfastDays") || 0;
              const lunchDays = form.watch("lunchDays") || 0;  
              const dinnerDays = form.watch("dinnerDays") || 0;
              
              const breakfastCost = breakfastDays * parseFloat(foodSettings?.breakfastPrice || "0");
              const lunchCost = lunchDays * parseFloat(foodSettings?.lunchPrice || "0");
              const dinnerCost = dinnerDays * parseFloat(foodSettings?.dinnerPrice || "0");
              const totalFoodCost = breakfastCost + lunchCost + dinnerCost;
              
              if (totalFoodCost > 0) {
                return (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Food Cost Summary:</h5>
                    <div className="text-sm space-y-1">
                      {breakfastCost > 0 && (
                        <div className="flex justify-between">
                          <span>Breakfast ({breakfastDays} coupons):</span>
                          <span>₹{breakfastCost.toLocaleString()}</span>
                        </div>
                      )}
                      {lunchCost > 0 && (
                        <div className="flex justify-between">
                          <span>Lunch ({lunchDays} coupons):</span>
                          <span>₹{lunchCost.toLocaleString()}</span>
                        </div>
                      )}
                      {dinnerCost > 0 && (
                        <div className="flex justify-between">
                          <span>Dinner ({dinnerDays} coupons):</span>
                          <span>₹{dinnerCost.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-1 border-t">
                        <span>Total Food Cost:</span>
                        <span>₹{totalFoodCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select onValueChange={(value) => form.setValue("paymentMethod", value as "upi" | "cash" | "card" | "bank_transfer" | "checkin")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="checkin">Pay at Check-in</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.paymentMethod && (
                <p className="text-sm text-red-600">{form.formState.errors.paymentMethod.message}</p>
              )}
            </div>

            {/* Payment Reference Field - Show for digital payments */}
            {(() => {
              const paymentMethod = form.watch("paymentMethod");
              const needsReference = ["upi", "card", "bank_transfer"].includes(paymentMethod);
              
              if (!needsReference) return null;
              
              return (
                <div className="space-y-2">
                  <Label htmlFor="paymentReference">Payment Reference ID</Label>
                  <Input
                    id="paymentReference"
                    {...form.register("paymentReference")}
                    placeholder={
                      paymentMethod === "upi" ? "UPI Transaction ID" :
                      paymentMethod === "card" ? "Card Transaction ID" :
                      paymentMethod === "bank_transfer" ? "Bank Reference Number" :
                      "Reference ID"
                    }
                  />
                  {form.formState.errors.paymentReference && (
                    <p className="text-sm text-red-600">{form.formState.errors.paymentReference.message}</p>
                  )}
                </div>
              );
            })()}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-brand-orange hover:bg-orange-600"
            disabled={createBookingMutation.isPending || isSubmitting}
          >
            {createBookingMutation.isPending || isSubmitting ? "Creating Booking..." : "Create Booking"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}