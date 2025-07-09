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
import { Settings, Users, Calendar, Crown, Plus, Edit, Trash2 } from "lucide-react";
import type { User, RoomCategory } from "@shared/schema";

interface TrusteeWithSettings extends User {
  totalBookings?: number;
  lastBooking?: string;
}

export default function TrusteeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTrustee, setEditingTrustee] = useState<TrusteeWithSettings | null>(null);
  const [autoBookDates, setAutoBookDates] = useState("");
  const [roomCategoryId, setRoomCategoryId] = useState("");

  const { data: trustees = [], isLoading: trusteesLoading } = useQuery<TrusteeWithSettings[]>({
    queryKey: ["/api/admin/trustees"],
  });

  const { data: roomCategories = [] } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
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
            Manage trustee auto-booking settings and privileges. Trustees get 2 automatic bookings per month.
          </p>
        </CardHeader>
      </Card>

      {/* Edit Form */}
      {editingTrustee && (
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
              <h4 className="font-medium mb-2">How Auto-Booking Works</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Trustees get 2 automatic bookings per month</li>
                <li>• Admin sets specific dates (e.g., 15th and 30th)</li>
                <li>• System books rooms automatically on those dates</li>
                <li>• Trustees receive email notifications</li>
                <li>• Trustees can opt-out if needed</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Date Format Examples</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• "15,30" - Books 15th and 30th of each month</li>
                <li>• "1,16" - Books 1st and 16th of each month</li>
                <li>• "10,25" - Books 10th and 25th of each month</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}