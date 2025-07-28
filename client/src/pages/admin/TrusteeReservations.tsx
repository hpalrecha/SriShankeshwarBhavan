import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Settings, Trash2, Plus, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TrusteeReservedDate {
  id: number;
  reservedDate: string;
  isEnabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function TrusteeReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDateForm, setNewDateForm] = useState({
    reservedDate: "",
    description: "Trustee Reserved Day",
    isEnabled: true,
  });

  // Fetch trustee reserved dates
  const { data: reservedDates = [], isLoading } = useQuery({
    queryKey: ["/api/admin/trustee-reserved-dates"],
  });



  // Create new reserved date mutation
  const createReservedDateMutation = useMutation({
    mutationFn: (data: typeof newDateForm) => 
      apiRequest("POST", "/api/admin/trustee-reserved-dates", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trustee reserved date created successfully",
      });
      setNewDateForm({ reservedDate: "", description: "Trustee Reserved Day", isEnabled: true });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trustee-reserved-dates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reserved date",
        variant: "destructive",
      });
    },
  });

  // Update reserved date mutation
  const updateReservedDateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<TrusteeReservedDate> }) =>
      apiRequest("PATCH", `/api/admin/trustee-reserved-dates/${id}`, updates),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trustee reserved date updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trustee-reserved-dates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reserved date",
        variant: "destructive",
      });
    },
  });

  // Delete reserved date mutation
  const deleteReservedDateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/trustee-reserved-dates/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trustee reserved date deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trustee-reserved-dates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reserved date",
        variant: "destructive",
      });
    },
  });

  const handleCreateReservedDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateForm.reservedDate) {
      toast({
        title: "Invalid Date",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }
    
    // Check if date is in the past
    const selectedDate = new Date(newDateForm.reservedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: "Invalid Date",
        description: "Cannot select dates in the past",
        variant: "destructive",
      });
      return;
    }
    
    createReservedDateMutation.mutate(newDateForm);
  };

  const handleToggleEnabled = (id: number, currentEnabled: boolean) => {
    updateReservedDateMutation.mutate({
      id,
      updates: { isEnabled: !currentEnabled },
    });
  };

  const handleDeleteReservedDate = (id: number) => {
    if (confirm("Are you sure you want to delete this trustee reserved date?")) {
      deleteReservedDateMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Trustee Reservations</h2>
      </div>

      {/* Feature Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            How Trustee Reservations Work
          </CardTitle>
          <CardDescription>
            Trustee reservations block all rooms on specific dates for trustee-only bookings. 
            Regular customers cannot book rooms on these dates, ensuring trustees have priority access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              • Select specific dates (month and year) to reserve for trustees<br />
              • Toggle individual dates on/off without deleting them<br />
              • Regular customers will see these dates as unavailable<br />
              • Trustees can still book on these reserved dates
            </p>
          </div>
        </CardContent>
      </Card>



      {/* Add New Reserved Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Reserved Date
          </CardTitle>
          <CardDescription>
            Select a specific date to be reserved for trustee bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateReservedDate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservedDate">Select Date</Label>
                <Input
                  id="reservedDate"
                  type="date"
                  value={newDateForm.reservedDate}
                  onChange={(e) => setNewDateForm({ ...newDateForm, reservedDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newDateForm.description}
                  onChange={(e) => setNewDateForm({ ...newDateForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={newDateForm.isEnabled}
                    onCheckedChange={(checked) => setNewDateForm({ ...newDateForm, isEnabled: checked })}
                  />
                  <span className="text-sm">{newDateForm.isEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={createReservedDateMutation.isPending}
            >
              {createReservedDateMutation.isPending ? "Creating..." : "Add Reserved Date"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Reserved Dates */}
      {reservedDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Reserved Dates
            </CardTitle>
            <CardDescription>
              Manage existing trustee reserved dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {reservedDates.map((date: TrusteeReservedDate) => {
                const reservedDate = new Date(date.reservedDate);
                const formattedDate = reservedDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const dayNumber = reservedDate.getDate();
                
                return (
                  <div
                    key={date.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-primary">
                        {dayNumber}
                      </div>
                      <div>
                        <div className="font-medium">{date.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formattedDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={date.isEnabled ? "default" : "secondary"}>
                        {date.isEnabled ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={date.isEnabled}
                        onCheckedChange={() => handleToggleEnabled(date.id, date.isEnabled)}
                        disabled={updateReservedDateMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReservedDate(date.id)}
                        disabled={deleteReservedDateMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {reservedDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{reservedDates.length}</div>
                <div className="text-sm text-muted-foreground">Total Dates</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {reservedDates.filter((d: TrusteeReservedDate) => d.isEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-gray-500">
                  {reservedDates.filter((d: TrusteeReservedDate) => !d.isEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Inactive</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(reservedDates.map((d: TrusteeReservedDate) => new Date(d.reservedDate).getFullYear())).size}
                </div>
                <div className="text-sm text-muted-foreground">Years</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}