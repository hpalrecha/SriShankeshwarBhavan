import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, DollarSign, TrendingUp, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardStats, BookingWithDetails } from "@/lib/types";

interface DashboardStatsProps {
  onViewBookingDetails?: (bookingId: number) => void;
}

export default function DashboardStats({ onViewBookingDetails }: DashboardStatsProps = {}) {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
  });

  const { data: recentBookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/recent-bookings"],
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      checked_in: "secondary", 
      checked_out: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "secondary",
      unpaid: "destructive",
      pending: "outline",
    };
    return <Badge variant={variants[paymentStatus] || "default"}>{paymentStatus}</Badge>;
  };

  if (statsLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-brand-orange-bg rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-brand-orange" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.todayBookings}</h3>
                <p className="text-sm text-gray-500">Today's Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.checkedIn}</h3>
                <p className="text-sm text-gray-500">Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">₹{stats.revenue.toLocaleString()}</h3>
                <p className="text-sm text-gray-500">Today's Donations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.occupancy}</h3>
                <p className="text-sm text-gray-500">Occupancy Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="text-center py-4">Loading bookings...</div>
          ) : !recentBookings || recentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent bookings found
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.slice(0, 5).map(({ booking, user, category }) => (
                <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{user.name}</h4>
                      <p className="text-sm text-gray-600">{booking.bookingId}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Users className="h-3 w-3" />
                        {booking.guests} guests • {booking.roomsBooked || 1} room{(booking.roomsBooked || 1) > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(booking.status)}
                      {getPaymentBadge(booking.paymentStatus)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Room Type</p>
                      <p className="font-medium">{category.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Check-in</p>
                      <p className="font-medium">{new Date(booking.checkinDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Check-out</p>
                      <p className="font-medium">{new Date(booking.checkoutDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Amount</p>
                      <p className="font-medium text-brand-orange">₹{parseFloat(booking.totalAmount).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewBookingDetails?.(booking.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
              
              {recentBookings.length > 5 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => onViewBookingDetails?.(-1)} // -1 indicates view all bookings
                  >
                    View All Bookings
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
