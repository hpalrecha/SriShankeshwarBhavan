import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Calendar, CreditCard, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BookingDetailsModal from "./booking-details-modal";
import type { BookingWithDetails } from "@/lib/types";

interface PaginatedBookingsResponse {
  bookings: BookingWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface BookingsTableProps {
  userFilter?: number | null;
}

export default function BookingsTable({ userFilter }: BookingsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: bookingsResponse, isLoading } = useQuery<PaginatedBookingsResponse>({
    queryKey: ["/api/admin/recent-bookings", currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/recent-bookings?page=${currentPage}&limit=30`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  const bookings = bookingsResponse?.bookings || [];
  const pagination = bookingsResponse?.pagination;
  
  // Reset current page if it's beyond available pages
  useEffect(() => {
    if (pagination && currentPage > pagination.totalPages && pagination.totalPages > 0) {
      setCurrentPage(1);
    }
  }, [pagination, currentPage]);

  // Filter bookings by user if userFilter is provided
  const filteredBookings = userFilter 
    ? bookings.filter(({ user }) => user.id === userFilter)
    : bookings;

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {userFilter ? `User Bookings (${filteredBookings.length})` : `All Bookings (${pagination?.total || filteredBookings.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Cards View */}
        <div className="block lg:hidden space-y-4 p-4">
          {filteredBookings.map(({ booking, user, category }) => (
            <Card key={booking.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Room:</span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Dates:</span>
                    <span className="text-sm">
                      {new Date(booking.checkinDate).toLocaleDateString()} - {new Date(booking.checkoutDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="text-sm font-medium">₹{booking.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Guests:</span>
                    <span className="text-sm">{booking.guests} guests, 1 room</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Booked on:</span>
                    <span className="text-sm">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50 flex-1"
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
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 flex-1"
                      onClick={() => handleStatusChange(booking.id, "checked_out")}
                      disabled={updateBookingMutation.isPending}
                    >
                      Check Out
                    </Button>
                  )}
                  
                  {(booking.status === "confirmed" || booking.status === "checked_in") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                          handleStatusChange(booking.id, "cancelled");
                        }
                      }}
                      disabled={updateBookingMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails({ booking, user, category })}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 font-medium text-gray-700">GUEST</th>
                <th className="text-left p-3 font-medium text-gray-700">ROOM</th>
                <th className="text-left p-3 font-medium text-gray-700">DATES</th>
                <th className="text-left p-3 font-medium text-gray-700">PAYMENT</th>
                <th className="text-left p-3 font-medium text-gray-700">BOOKED ON</th>
                <th className="text-left p-3 font-medium text-gray-700">STATUS</th>
                <th className="text-left p-3 font-medium text-gray-700">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(({ booking, user, category }) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">{booking.guests} guests, 1 room</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{category.name}</div>
                    <div className="text-sm text-gray-500">
                      ₹{category.price}/night
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {new Date(booking.checkinDate).toLocaleDateString()} - {new Date(booking.checkoutDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.ceil((new Date(booking.checkoutDate).getTime() - new Date(booking.checkinDate).getTime()) / (1000 * 60 * 60 * 24))} nights
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        ₹{booking.totalAmount}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.paymentMethod === "pay_at_checkin" ? "Pay at Check-in" : booking.paymentMethod}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm text-gray-900">
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : ''}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="space-y-2">
                      <div>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      {booking.status === "confirmed" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleStatusChange(booking.id, "checked_in")}
                            disabled={updateBookingMutation.isPending}
                          >
                            Check In
                          </Button>
                        </div>
                      )}
                      
                      {booking.status === "checked_in" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => handleStatusChange(booking.id, "checked_out")}
                            disabled={updateBookingMutation.isPending}
                          >
                            Check Out
                          </Button>
                        </div>
                      )}
                      
                      {(booking.status === "confirmed" || booking.status === "checked_in") && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                handleStatusChange(booking.id, "cancelled");
                              }
                            }}
                            disabled={updateBookingMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails({ booking, user, category })}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls - Only show if we actually have more than 1 page of data */}
        {pagination && pagination.total > pagination.limit && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} bookings
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  );
                })}
                
                {pagination.totalPages > 5 && (
                  <>
                    <span className="text-gray-500">...</span>
                    <Button
                      variant={currentPage === pagination.totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      className="w-8"
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Booking Details Modal */}
    {selectedBooking && (
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }}
      />
    )}
    </>
  );
}
