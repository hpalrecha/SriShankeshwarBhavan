import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Phone, Calendar, CreditCard, UserCheck, Users, Settings } from "lucide-react";
import type { User as UserType, RoomBooking, RoomCategory } from "@shared/schema";

interface UserWithBookings extends UserType {
  totalBookings?: number;
  lastBooking?: string;
}

interface UserDetailsModalProps {
  user: UserWithBookings | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBookings?: (userId: number) => void;
  onCreateBooking?: (user: UserWithBookings) => void;
}

interface BookingWithDetails {
  booking: RoomBooking;
  category: { name: string; price: string };
}

export default function UserDetailsModal({ user, isOpen, onClose, onViewBookings, onCreateBooking }: UserDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTrusteeSettings, setShowTrusteeSettings] = useState(false);
  const [trusteeAutoBookDates, setTrusteeAutoBookDates] = useState(user?.trusteeAutoBookDates || "");
  const [trusteeRoomCategoryId, setTrusteeRoomCategoryId] = useState(user?.trusteeRoomCategoryId?.toString() || "");

  const { data: userBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/user-bookings", user?.id],
    enabled: !!user?.id,
  });

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
    enabled: showTrusteeSettings,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { 
      isTrustee?: boolean; 
      trusteeStatus?: string;
      trusteeAutoBookDates?: string;
      trusteeRoomCategoryId?: number;
    }) => {
      if (!user) throw new Error("No user selected");
      
      const response = await apiRequest("PATCH", `/api/admin/users/${user.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (!showTrusteeSettings) {
        onClose();
      }
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user settings.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleAccountTypeChange = (newType: string) => {
    if (!user) return;
    
    setIsUpdating(true);
    
    if (newType === "trustee") {
      updateUserMutation.mutate({
        isTrustee: true,
        trusteeStatus: "active"
      });
    } else {
      updateUserMutation.mutate({
        isTrustee: false,
        trusteeStatus: undefined
      });
    }
  };

  const handleTrusteeSettingsUpdate = () => {
    if (!user) return;
    
    setIsUpdating(true);
    updateUserMutation.mutate({
      trusteeAutoBookDates,
      trusteeRoomCategoryId: trusteeRoomCategoryId ? parseInt(trusteeRoomCategoryId) : undefined
    });
  };

  if (!user) return null;

  const totalSpent = userBookings.reduce((sum, { booking }) => {
    return sum + parseFloat(booking.totalAmount);
  }, 0);

  const completedBookings = userBookings.filter(({ booking }) => 
    booking.status === "checked_out"
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-gray-500">User ID: {user.id}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                {user.mobile && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Mobile:</span>
                    <span>{user.mobile}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Joined:</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Account Type Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Account Type Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Current Type:</span>
                  <Badge variant={user.isTrustee ? "default" : "secondary"}>
                    {user.isTrustee ? "Trustee" : "Guest"}
                  </Badge>
                  {user.trusteeStatus && (
                    <Badge variant="outline" className="text-xs">
                      {user.trusteeStatus}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="font-medium">Change to:</span>
                  <Select 
                    value={user.isTrustee ? "trustee" : "guest"}
                    onValueChange={handleAccountTypeChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="trustee">Trustee</SelectItem>
                    </SelectContent>
                  </Select>
                  {isUpdating && (
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <p className="font-medium mb-1">Account Type Information:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Guest:</strong> Regular booking privileges</li>
                    <li>• <strong>Trustee:</strong> Auto-booking privileges, 2 days per month</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Booking History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Booking History ({userBookings.length} total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bookings found</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {userBookings.map(({ booking, category }) => (
                      <div key={booking.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.bookingId}</p>
                            <p className="text-sm text-gray-600">{category.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(booking.checkinDate).toLocaleDateString()} - {new Date(booking.checkoutDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{parseFloat(booking.totalAmount).toLocaleString()}</p>
                            <Badge variant={
                              booking.status === "checked_out" ? "default" :
                              booking.status === "checked_in" ? "secondary" :
                              booking.status === "confirmed" ? "outline" : "destructive"
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{userBookings.length}</p>
                  <p className="text-sm text-blue-800">Total Bookings</p>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{completedBookings}</p>
                  <p className="text-sm text-green-800">Completed Stays</p>
                </div>
                
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">₹{totalSpent.toLocaleString()}</p>
                  <p className="text-sm text-orange-800">Total Spent</p>
                </div>

                {user.lastBooking && (
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">Last Booking</p>
                    <p className="text-xs text-purple-800">
                      {new Date(user.lastBooking).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (onViewBookings) {
                      onViewBookings(user.id);
                      onClose();
                    }
                  }}
                >
                  View All Bookings
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (onCreateBooking) {
                      onCreateBooking(user);
                      onClose();
                    }
                  }}
                >
                  Create Booking
                </Button>
                
                {user.isTrustee && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setTrusteeAutoBookDates(user.trusteeAutoBookDates || "");
                      setTrusteeRoomCategoryId(user.trusteeRoomCategoryId?.toString() || "");
                      setShowTrusteeSettings(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Trustee Settings
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trustee Settings Modal */}
        {showTrusteeSettings && user?.isTrustee && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trustee Auto-Booking Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoBookDates">Auto-Book Dates (2 days per month)</Label>
                <Input
                  id="autoBookDates"
                  placeholder="e.g., 15,30 (for 15th and 30th of each month)"
                  value={trusteeAutoBookDates}
                  onChange={(e) => setTrusteeAutoBookDates(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter 2 dates separated by comma (e.g., "15,30" for 15th and 30th of each month)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomCategory">Preferred Room Category</Label>
                <Select value={trusteeRoomCategoryId} onValueChange={setTrusteeRoomCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room category" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name} - ₹{category.price}/night
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium mb-1">Auto-Booking Information:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Trustees get automatic bookings for 2 days per month</li>
                  <li>• Specify dates like "15,30" for 15th and 30th of each month</li>
                  <li>• Choose preferred room category for auto-bookings</li>
                  <li>• Trustees can opt-out of individual auto-bookings if needed</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTrusteeSettings(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleTrusteeSettingsUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating && (
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}