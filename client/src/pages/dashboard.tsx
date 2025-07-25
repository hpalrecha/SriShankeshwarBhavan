import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CreditCard, MapPin, Phone, Mail, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomBooking, User } from "@shared/schema";

interface BookingWithDetails {
  booking: RoomBooking;
  user: User;
  category: { name: string; description: string };
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Get user's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/my-bookings"],
    enabled: !!user,
    retry: false,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      await apiRequest("PATCH", `/api/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-bookings"] });
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation failed",
        description: "Unable to cancel booking. Please contact support.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging you out.",
        variant: "destructive",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Please log in to view your dashboard
              </CardDescription>
            </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setLocation("/")}
              className="bg-brand-orange hover:bg-orange-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "checked_in":
        return "bg-blue-100 text-blue-800";
      case "checked_out":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setLocation("/")}>
                <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">SSBB</span>
                </div>
                <h1 className="ml-3 text-xl font-semibold text-gray-900 hidden sm:block">Sri Shankeshwar Bengaluru Bhavan</h1>
                <h1 className="ml-3 text-lg font-semibold text-gray-900 sm:hidden">SSBB</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/")}
                className="hidden sm:inline-flex"
              >
                Home
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your bookings and account settings</p>
        </div>

        {/* User Info Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-orange" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Email:</span>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              {user?.isTrustee && (
                <Badge className="bg-orange-100 text-orange-800">
                  Trustee Member
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => window.location.href = "/"}
                variant="outline" 
                className="w-full"
              >
                Make New Booking
              </Button>
              {user?.isTrustee && (
                <Button 
                  onClick={() => window.location.href = "/trustee"}
                  variant="outline" 
                  className="w-full"
                >
                  Trustee Panel
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-orange">
                {bookings.length}
              </div>
              <p className="text-gray-600">Total Bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
            <CardDescription>
              View and manage all your room bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-600 mb-4">
                  You haven't made any bookings. Start planning your stay!
                </p>
                <Button 
                  onClick={() => window.location.href = "/"}
                  className="bg-brand-orange hover:bg-orange-600"
                >
                  Make Your First Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking: any) => (
                  <div
                    key={booking.booking.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.category.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Booking ID: {booking.booking.bookingId}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.booking.status)}>
                        {booking.booking.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Check-in</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.booking.checkinDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Check-out</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.booking.checkoutDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Total Amount</p>
                          <p className="text-sm text-gray-600">
                            ₹{booking.booking.totalAmount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {booking.booking.roomNumber && (
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Room Number: {booking.booking.roomNumber}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Payment: {booking.booking.paymentStatus} via {booking.booking.paymentMethod}
                      </div>
                      
                      {booking.booking.status === "confirmed" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelBookingMutation.mutate(booking.booking.id)}
                          disabled={cancelBookingMutation.isPending}
                        >
                          {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}