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
import { Calendar, Users, Phone, Mail, Plus, Minus } from "lucide-react";
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
  roomSelections: z.array(roomSelectionSchema).refine(
    (selections) => selections.some(s => s.quantity > 0),
    "At least one room must be selected"
  ),
  paymentMethod: z.enum(["upi", "cash", "card", "bank_transfer", "checkin"]),
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
      roomSelections: [],
      paymentMethod: "cash",
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

      const response = await apiRequest("POST", "/api/admin/bookings/combination", {
        user: {
          name: data.guestName,
          email: data.guestEmail,
          mobile: data.guestMobile,
        },
        booking: {
          checkinDate: data.checkinDate,
          checkoutDate: data.checkoutDate,
          guests: data.guests,
          roomSelections: roomSelectionArray,
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

  const onSubmit = (data: AdminBookingFormData) => {
    if (getTotalRooms() === 0) {
      toast({
        title: "No rooms selected",
        description: "Please select at least one room to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    createBookingMutation.mutate(data);
    setIsSubmitting(false);
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
              <div className="text-sm text-gray-600">
                Total Rooms: {getTotalRooms()} | Total Amount: ₹{getTotalAmount().toLocaleString()}
              </div>
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