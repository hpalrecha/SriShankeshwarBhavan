import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, CreditCard, Phone, Mail, Utensils, Clock, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Footer from "@/components/Footer";

// Converts an ISO/date-time string into the value <input type="datetime-local">
// expects (local time, no timezone/seconds) - a raw ISO string with "Z"
// or offset just shows blank in that input.
function toDatetimeLocalValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Booking {
  booking: {
    id: number;
    bookingId: string;
    checkinDate: string;
    checkoutDate: string;
    guests: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    totalAmount: string;
    arrivingFrom?: string;
    goingTo?: string;
    estimatedArrivalTime?: string;
    estimatedDepartureTime?: string;
    breakfastDays: number;
    lunchDays: number;
    dinnerDays: number;
    foodAmount: string;
    createdAt: string;
  };
  user: {
    name: string;
    email: string;
    mobile: string;
    address?: string;
    city?: string;
    state?: string;
  };
  category: {
    name: string;
    description: string;
    price: string;
  };
}

export default function MyBookings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingBooking, setEditingBooking] = useState<Booking["booking"] | null>(null);
  const [travelForm, setTravelForm] = useState({
    estimatedArrivalTime: "",
    estimatedDepartureTime: "",
    arrivingFrom: "",
    goingTo: "",
  });

  const openEditDialog = (booking: Booking["booking"]) => {
    setEditingBooking(booking);
    setTravelForm({
      estimatedArrivalTime: toDatetimeLocalValue(booking.estimatedArrivalTime),
      estimatedDepartureTime: toDatetimeLocalValue(booking.estimatedDepartureTime),
      arrivingFrom: booking.arrivingFrom || "",
      goingTo: booking.goingTo || "",
    });
  };

  const updateTravelDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!editingBooking) return;
      return await apiRequest("PATCH", `/api/bookings/${editingBooking.id}/travel-details`, {
        estimatedArrivalTime: travelForm.estimatedArrivalTime
          ? new Date(travelForm.estimatedArrivalTime).toISOString()
          : undefined,
        estimatedDepartureTime: travelForm.estimatedDepartureTime
          ? new Date(travelForm.estimatedDepartureTime).toISOString()
          : undefined,
        arrivingFrom: travelForm.arrivingFrom || undefined,
        goingTo: travelForm.goingTo || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-bookings"] });
      toast({ title: "Booking Updated", description: "Your travel details have been updated." });
      setEditingBooking(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to view your bookings.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/my-bookings"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      confirmed: "bg-blue-100 text-blue-800",
      checked_in: "bg-green-100 text-green-800",
      checked_out: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      unpaid: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Book Another Room
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!bookings || bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-6">You haven't made any bookings yet.</p>
              <Button onClick={() => navigate("/")} className="bg-brand-orange hover:bg-brand-orange-light">
                Make Your First Booking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((item) => (
              <Card key={item.booking.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.category.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Badge className={getStatusBadge(item.booking.status)}>
                        {item.booking.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPaymentStatusBadge(item.booking.paymentStatus)}>
                        {item.booking.paymentStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Booking ID: <span className="font-mono text-brand-orange">{item.booking.bookingId}</span></p>
                    <p className="text-sm text-gray-500">
                      Booked on: {item.booking.createdAt ? new Date(item.booking.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dates and Guests */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Check-in</p>
                        <p className="text-sm text-gray-600">
                          {new Date(item.booking.checkinDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Check-out</p>
                        <p className="text-sm text-gray-600">
                          {new Date(item.booking.checkoutDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Guests</p>
                        <p className="text-sm text-gray-600">{item.booking.guests}</p>
                      </div>
                    </div>
                  </div>

                  {/* Travel Details */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Travel Details</p>
                      {item.booking.status !== "cancelled" && item.booking.status !== "checked_out" && (
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(item.booking)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.booking.arrivingFrom && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Arriving From</p>
                            <p className="text-sm text-gray-600">{item.booking.arrivingFrom}</p>
                          </div>
                        </div>
                      )}
                      {item.booking.goingTo && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Going To</p>
                            <p className="text-sm text-gray-600">{item.booking.goingTo}</p>
                          </div>
                        </div>
                      )}
                      {item.booking.estimatedArrivalTime && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Est. Arrival Time</p>
                            <p className="text-sm text-gray-600">
                              {new Date(item.booking.estimatedArrivalTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {item.booking.estimatedDepartureTime && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Est. Departure Time</p>
                            <p className="text-sm text-gray-600">
                              {new Date(item.booking.estimatedDepartureTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Food Options */}
                  {(item.booking.breakfastDays > 0 || item.booking.lunchDays > 0 || item.booking.dinnerDays > 0) && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center space-x-2 mb-2">
                        <Utensils className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium">Food Coupons</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {item.booking.breakfastDays > 0 && (
                          <span>Breakfast: {item.booking.breakfastDays}</span>
                        )}
                        {item.booking.lunchDays > 0 && (
                          <span>Lunch: {item.booking.lunchDays}</span>
                        )}
                        {item.booking.dinnerDays > 0 && (
                          <span>Dinner: {item.booking.dinnerDays}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Info */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Total Donation: ₹{parseFloat(item.booking.totalAmount).toLocaleString()}</span>
                      </div>
                      <span className="text-sm text-gray-600 capitalize">
                        {item.booking.paymentMethod === "checkin" ? "Pay at Check-in" : "Online Payment"}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="pt-2 border-t text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{item.user.mobile}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{item.user.email}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />

      {/* Edit Travel Details Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Travel Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="eta">Estimated Arrival Time</Label>
              <Input
                id="eta"
                type="datetime-local"
                value={travelForm.estimatedArrivalTime}
                onChange={(e) => setTravelForm((f) => ({ ...f, estimatedArrivalTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="etd">Estimated Departure Time</Label>
              <Input
                id="etd"
                type="datetime-local"
                value={travelForm.estimatedDepartureTime}
                onChange={(e) => setTravelForm((f) => ({ ...f, estimatedDepartureTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="arrivingFrom">Arriving From</Label>
              <Input
                id="arrivingFrom"
                value={travelForm.arrivingFrom}
                onChange={(e) => setTravelForm((f) => ({ ...f, arrivingFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="goingTo">Going To</Label>
              <Input
                id="goingTo"
                value={travelForm.goingTo}
                onChange={(e) => setTravelForm((f) => ({ ...f, goingTo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBooking(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateTravelDetailsMutation.mutate()}
              disabled={updateTravelDetailsMutation.isPending}
            >
              {updateTravelDetailsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}