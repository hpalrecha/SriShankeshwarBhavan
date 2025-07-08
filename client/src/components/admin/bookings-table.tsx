import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Calendar, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BookingDetailsModal from "./booking-details-modal";
import type { BookingWithDetails } from "@/lib/types";

export default function BookingsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/recent-bookings"],
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/bookings/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkouts"] });
      toast({
        title: "Booking Updated",
        description: "Booking has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (bookingId: number, status: string) => {
    updateBookingMutation.mutate({
      id: bookingId,
      updates: { status },
    });
  };

  const handleViewDetails = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      checked_in: "secondary",
      checked_out: "outline",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "secondary",
      unpaid: "destructive",
      pending: "outline",
    };

    return (
      <Badge variant={variants[paymentStatus] || "default"}>
        {paymentStatus.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading bookings...</div>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No bookings found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map(({ booking, user, category }) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-sm text-gray-500">{booking.guests} guests, {booking.roomsBooked || 1} room{(booking.roomsBooked || 1) > 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(booking.checkinDate).toLocaleDateString()} - {new Date(booking.checkoutDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentBadge(booking.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails({ booking, user, category })}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(booking.id, "checked_in")}
                          disabled={updateBookingMutation.isPending}
                        >
                          Check In
                        </Button>
                      )}
                      {booking.status === "checked_in" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(booking.id, "checked_out")}
                          disabled={updateBookingMutation.isPending}
                        >
                          Check Out
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(booking.id, "cancelled")}
                        disabled={updateBookingMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <BookingDetailsModal 
      booking={selectedBooking}
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setSelectedBooking(null);
      }}
    />
    </>
  );
}
