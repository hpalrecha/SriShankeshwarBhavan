import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function TrusteeTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trustees, isLoading } = useQuery<User[]>({
    queryKey: ["/api/trustees"],
  });

  const updateTrusteeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/trustees/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trustees"] });
      toast({
        title: "Trustee Updated",
        description: "Trustee has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Update trustee error:", error);
      toast({
        title: "Error",
        description: "Failed to update trustee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const autoBookingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/trustees/auto-booking", {});
    },
    onSuccess: () => {
      toast({
        title: "Auto-Booking Triggered",
        description: "Auto-booking process has been initiated for all active trustees.",
      });
    },
    onError: (error) => {
      console.error("Auto-booking error:", error);
      toast({
        title: "Error",
        description: "Failed to trigger auto-booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (trusteeId: number, status: string) => {
    updateTrusteeMutation.mutate({
      id: trusteeId,
      updates: { trusteeStatus: status },
    });
  };

  const handleTriggerAutoBooking = () => {
    autoBookingMutation.mutate();
  };

  if (isLoading) {
    return <div>Loading trustees...</div>;
  }

  if (!trustees || trustees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Trustees</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No trustees found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Trustees</CardTitle>
        <Button 
          className="bg-brand-orange hover:bg-brand-orange-light"
          onClick={handleTriggerAutoBooking}
          disabled={autoBookingMutation.isPending}
        >
          {autoBookingMutation.isPending ? "Triggering..." : "Trigger Auto-Booking"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trustee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-Book Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trustees.map((trustee) => (
                <tr key={trustee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{trustee.name}</div>
                    <div className="text-sm text-gray-500">{trustee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trustee.trusteeAutoBookDates || "Not set"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trustee.trusteeRoomCategoryId ? "Assigned" : "Not assigned"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={trustee.trusteeStatus === "active" ? "default" : "secondary"}>
                      {trustee.trusteeStatus?.toUpperCase() || "ACTIVE"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        Send Opt-out
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(trustee.id, "inactive")}
                        disabled={updateTrusteeMutation.isPending}
                      >
                        Deactivate
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
  );
}
