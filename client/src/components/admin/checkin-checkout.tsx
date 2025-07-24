import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails } from "@/lib/types";
import BookingDetailsModal from "./booking-details-modal";
import { Plane } from "lucide-react";

const travelDetailsSchema = z.object({
  arrivingFrom: z.string().optional(),
  goingTo: z.string().optional(),
});

export default function CheckinCheckout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [showTravelDialog, setShowTravelDialog] = useState(false);
  const [checkingInBooking, setCheckingInBooking] = useState<BookingWithDetails | null>(null);

  const travelForm = useForm<z.infer<typeof travelDetailsSchema>>({
    resolver: zodResolver(travelDetailsSchema),
    defaultValues: {
      arrivingFrom: "",
      goingTo: "",
    },
  });

  const { data: checkins, isLoading: loadingCheckins } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/todays-checkins"],
  });

  const { data: checkouts, isLoading: loadingCheckouts } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/todays-checkouts"],
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/bookings/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-bookings"] });
      toast({
        title: "Status Updated",
        description: "Guest status has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update guest status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckIn = (booking: BookingWithDetails) => {
    setCheckingInBooking(booking);
    // Pre-populate with existing data if available
    travelForm.reset({
      arrivingFrom: booking.booking.arrivingFrom || "",
      goingTo: booking.booking.goingTo || "",
    });
    setShowTravelDialog(true);
  };

  const confirmCheckIn = (values: z.infer<typeof travelDetailsSchema>) => {
    if (!checkingInBooking) return;
    
    updateBookingMutation.mutate({
      id: checkingInBooking.booking.id,
      updates: { 
        status: "checked_in",
        arrivingFrom: values.arrivingFrom,
        goingTo: values.goingTo,
      },
    });
    setShowTravelDialog(false);
    setCheckingInBooking(null);
    travelForm.reset();
  };

  const handleCheckOut = (bookingId: number) => {
    updateBookingMutation.mutate({
      id: bookingId,
      updates: { status: "checked_out" },
    });
  };

  if (loadingCheckins || loadingCheckouts) {
    return <div>Loading check-in/check-out data...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Today's Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {!checkins || checkins.length === 0 ? (
            <p className="text-gray-500">No check-ins scheduled for today.</p>
          ) : (
            <div className="space-y-4">
              {checkins.map(({ booking, user, category }) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomNumber ? `Room ${booking.roomNumber}` : "Room TBA"} - {category.name}
                    </p>
                    {booking.actualCheckinTime && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Checked in: {new Date(booking.actualCheckinTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:space-x-2 sm:gap-0">
                    {booking.status === 'checked_in' ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                              updateBookingMutation.mutate({
                                id: booking.id,
                                updates: { status: "cancelled" },
                              });
                            }
                          }}
                          disabled={updateBookingMutation.isPending}
                        >
                          Cancel Booking
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-brand-orange hover:bg-brand-orange-light"
                        onClick={() => handleCheckIn({ booking, user, category })}
                        disabled={updateBookingMutation.isPending}
                      >
                        Check In
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBooking({ booking, user, category })}
                    >
                      View ID
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Check-outs</CardTitle>
        </CardHeader>
        <CardContent>
          {!checkouts || checkouts.length === 0 ? (
            <p className="text-gray-500">No check-outs scheduled for today.</p>
          ) : (
            <div className="space-y-4">
              {checkouts.map(({ booking, user, category }) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomNumber ? `Room ${booking.roomNumber}` : "Room TBA"} - {category.name}
                    </p>
                    {booking.actualCheckinTime && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Checked in: {new Date(booking.actualCheckinTime).toLocaleString()}
                      </p>
                    )}
                    {booking.actualCheckoutTime && (
                      <p className="text-xs text-blue-600 font-medium">
                        ✓ Checked out: {new Date(booking.actualCheckoutTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:space-x-2 sm:gap-0">
                    {booking.status === 'checked_out' ? (
                      <div className="text-sm text-green-600 font-medium">
                        Completed
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => handleCheckOut(booking.id)}
                        disabled={updateBookingMutation.isPending}
                      >
                        Check Out
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBooking({ booking, user, category })}
                    >
                      Payment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* Travel Details Check-in Dialog */}
      <Dialog open={showTravelDialog} onOpenChange={setShowTravelDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Guest Travel Details
            </DialogTitle>
          </DialogHeader>
          
          {checkingInBooking && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{checkingInBooking.user.name}</p>
                <p className="text-sm text-gray-600">
                  {checkingInBooking.category.name} - Booking ID: {checkingInBooking.booking.bookingId}
                </p>
              </div>

              <Form {...travelForm}>
                <form onSubmit={travelForm.handleSubmit(confirmCheckIn)} className="space-y-4">
                  <FormField
                    control={travelForm.control}
                    name="arrivingFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arriving From</FormLabel>
                        <FormControl>
                          <Input placeholder="City/Location (e.g., Mumbai, Bangalore)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={travelForm.control}
                    name="goingTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Going To (Next Destination)</FormLabel>
                        <FormControl>
                          <Input placeholder="City/Location (e.g., Delhi, Ahmedabad)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTravelDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateBookingMutation.isPending}
                      className="flex-1 bg-brand-orange hover:bg-brand-orange-light"
                    >
                      {updateBookingMutation.isPending ? "Checking In..." : "Complete Check-In"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
