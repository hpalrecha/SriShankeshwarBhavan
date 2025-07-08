import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails } from "@/lib/types";

export default function CheckinCheckout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleCheckIn = (bookingId: number) => {
    updateBookingMutation.mutate({
      id: bookingId,
      updates: { status: "checked_in" },
    });
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
                <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomNumber ? `Room ${booking.roomNumber}` : "Room TBA"} - {category.name}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="bg-brand-orange hover:bg-brand-orange-light"
                      onClick={() => handleCheckIn(booking.id)}
                      disabled={updateBookingMutation.isPending}
                    >
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
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
                <div key={booking.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomNumber ? `Room ${booking.roomNumber}` : "Room TBA"} - {category.name}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => handleCheckOut(booking.id)}
                      disabled={updateBookingMutation.isPending}
                    >
                      Check Out
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
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
    </div>
  );
}
