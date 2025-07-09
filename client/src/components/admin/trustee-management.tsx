import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, Calendar, Crown, Plus, Edit, Trash2, CalendarDays, Save } from "lucide-react";
import type { User, RoomCategory, TrusteeAutoBooking } from "@shared/schema";

interface TrusteeWithSettings extends User {
  totalBookings?: number;
  lastBooking?: string;
}

export default function TrusteeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"trustees" | "calendar">("trustees");
  const [editingTrustee, setEditingTrustee] = useState<TrusteeWithSettings | null>(null);
  const [autoBookDates, setAutoBookDates] = useState("");
  const [roomCategoryId, setRoomCategoryId] = useState("");
  
  // Calendar management state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyDates, setMonthlyDates] = useState("");
  const [monthlyRoomCategory, setMonthlyRoomCategory] = useState("");

  const { data: trustees = [], isLoading: trusteesLoading } = useQuery<TrusteeWithSettings[]>({
    queryKey: ["/api/admin/trustees"],
  });

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const { data: autoBookings = [] } = useQuery<TrusteeAutoBooking[]>({
    queryKey: ["/api/admin/trustee-auto-bookings", selectedYear, selectedMonth],
    enabled: activeTab === "calendar",
  });

  const updateTrusteeMutation = useMutation({
    mutationFn: async (data: { 
      id: number;
      trusteeAutoBookDates?: string;
      trusteeRoomCategoryId?: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${data.id}`, {
        trusteeAutoBookDates: data.trusteeAutoBookDates,
        trusteeRoomCategoryId: data.trusteeRoomCategoryId
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trustee Updated",
        description: "Trustee auto-booking settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trustees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingTrustee(null);
      setAutoBookDates("");
      setRoomCategoryId("");
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update trustee settings.",
        variant: "destructive",
      });
    },
  });

  const createAutoBookingMutation = useMutation({
    mutationFn: async (data: {
      year: number;
      month: number;
      dates: string;
      roomCategoryId: number;
    }) => {
      const response = await apiRequest("POST", "/api/admin/trustee-auto-bookings", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Auto-Booking Schedule Created",
        description: "Monthly auto-booking dates have been set for all trustees.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/trustee-auto-bookings", selectedYear, selectedMonth] 
      });
      setMonthlyDates("");
      setMonthlyRoomCategory("");
    },
    onError: (error) => {
      toast({
        title: "Schedule Failed",
        description: error.message || "Failed to create auto-booking schedule.",
        variant: "destructive",
      });
    },
  });

  const handleEditTrustee = (trustee: TrusteeWithSettings) => {
    setEditingTrustee(trustee);
    setAutoBookDates(trustee.trusteeAutoBookDates || "");
    setRoomCategoryId(trustee.trusteeRoomCategoryId?.toString() || "");
  };

  const handleSaveSettings = () => {
    if (!editingTrustee) return;

    updateTrusteeMutation.mutate({
      id: editingTrustee.id,
      trusteeAutoBookDates: autoBookDates,
      trusteeRoomCategoryId: roomCategoryId ? parseInt(roomCategoryId) : undefined
    });
  };

  const handleCancelEdit = () => {
    setEditingTrustee(null);
    setAutoBookDates("");
    setRoomCategoryId("");
  };

  const getRoomCategoryName = (categoryId?: number) => {
    if (!categoryId) return "Not set";
    const category = roomCategories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const handleCreateMonthlySchedule = () => {
    if (!monthlyDates || !monthlyRoomCategory) {
      toast({
        title: "Missing Information",
        description: "Please select dates and room category for the monthly schedule.",
        variant: "destructive",
      });
      return;
    }

    createAutoBookingMutation.mutate({
      year: selectedYear,
      month: selectedMonth,
      dates: monthlyDates,
      roomCategoryId: parseInt(monthlyRoomCategory)
    });
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1];
  };

  if (trusteesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Trustee Management
          </CardTitle>
          <p className="text-gray-600">
            Manage trustee auto-booking settings and monthly booking schedules for all trustees.
          </p>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab("trustees")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "trustees"
                  ? "bg-brand-orange text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Trustees ({trustees.length})
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "calendar"
                  ? "bg-brand-orange text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <CalendarDays className="h-4 w-4 inline mr-2" />
              Monthly Schedule
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Schedule Tab */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          {/* Month/Year Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Monthly Auto-Booking Schedule
              </CardTitle>
              <p className="text-gray-600">
                Set auto-booking dates for all trustees on a monthly basis. All trustees will automatically get rooms booked on the specified dates.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {getMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Auto-Book Dates</Label>
                  <Input
                    placeholder="e.g., 15,30"
                    value={monthlyDates}
                    onChange={(e) => setMonthlyDates(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Category</Label>
                  <Select value={monthlyRoomCategory} onValueChange={setMonthlyRoomCategory}>
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

                <div className="flex items-end">
                  <Button 
                    onClick={handleCreateMonthlySchedule}
                    disabled={createAutoBookingMutation.isPending}
                    className="w-full"
                  >
                    {createAutoBookingMutation.isPending && (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                    )}
                    <Save className="h-4 w-4 mr-2" />
                    Set Monthly Schedule
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium mb-1">How Monthly Auto-Booking Works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Set specific dates for {getMonthName(selectedMonth)} {selectedYear} (e.g., "15,30" for 15th and 30th)</li>
                  <li>• All active trustees will automatically get rooms booked on these dates</li>
                  <li>• Choose the room category that will be booked for all trustees</li>
                  <li>• System will create bookings automatically for all trustees</li>
                  <li>• Trustees can still opt-out of individual bookings if needed</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Current Month Schedule */}
          {autoBookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Current Schedule for {getMonthName(selectedMonth)} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {autoBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Dates: {booking.autoBookDates}</p>
                        <p className="text-sm text-gray-600">
                          Room: {getRoomCategoryName(booking.roomCategoryId)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Applies to all {trustees.length} trustees
                        </p>
                      </div>
                      <Badge variant={booking.status === "active" ? "default" : "secondary"}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Form */}
      {activeTab === "trustees" && editingTrustee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit Auto-Booking Settings for {editingTrustee.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="autoBookDates">Auto-Book Dates (2 days per month)</Label>
                <Input
                  id="autoBookDates"
                  placeholder="e.g., 15,30 (for 15th and 30th of each month)"
                  value={autoBookDates}
                  onChange={(e) => setAutoBookDates(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter 2 dates separated by comma (e.g., "15,30" for 15th and 30th of each month)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomCategory">Preferred Room Category</Label>
                <Select value={roomCategoryId} onValueChange={setRoomCategoryId}>
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
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateTrusteeMutation.isPending}
              >
                {updateTrusteeMutation.isPending && (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trustees List */}
      {activeTab === "trustees" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Trustees ({trustees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trustees.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trustees found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Users can be converted to trustees from the Users tab.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trustee Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Auto-Book Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preferred Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trustees.map((trustee) => (
                    <tr key={trustee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{trustee.name}</div>
                            <div className="text-sm text-gray-500">{trustee.email}</div>
                            {trustee.mobile && (
                              <div className="text-sm text-gray-500">{trustee.mobile}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {trustee.trusteeAutoBookDates || (
                            <span className="text-gray-400 italic">Not configured</span>
                          )}
                        </div>
                        {trustee.trusteeAutoBookDates && (
                          <div className="text-xs text-gray-500">
                            Days: {trustee.trusteeAutoBookDates.split(',').join(', ')} of each month
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getRoomCategoryName(trustee.trusteeRoomCategoryId)}
                        </div>
                        {trustee.trusteeRoomCategoryId && (
                          <div className="text-xs text-gray-500">
                            ₹{roomCategories.find(cat => cat.id === trustee.trusteeRoomCategoryId)?.price}/night
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={trustee.trusteeStatus === "active" ? "default" : "secondary"}>
                          {trustee.trusteeStatus || "active"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTrustee(trustee)}
                          disabled={editingTrustee?.id === trustee.id}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {editingTrustee?.id === trustee.id ? "Editing..." : "Edit Settings"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Auto-Booking Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Auto-Booking System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Monthly Schedule System</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Admin sets monthly auto-booking dates for ALL trustees</li>
                <li>• All active trustees get automatic bookings on the same dates</li>
                <li>• Dates can vary month by month as needed</li>
                <li>• System books rooms automatically for all trustees</li>
                <li>• Individual trustees can opt-out if needed</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Date Format Examples</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• "15,30" - Books 15th and 30th for all trustees</li>
                <li>• "1,16" - Books 1st and 16th for all trustees</li>
                <li>• "10,25" - Books 10th and 25th for all trustees</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}