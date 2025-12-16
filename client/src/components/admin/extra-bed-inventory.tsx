import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bed, Package, Settings, AlertTriangle, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExtraBedInventory {
  id: number;
  totalBeds: number;
  bedsInUse: number;
  pricePerNight: string;
  lastUpdated: string;
}

interface RoomCategory {
  id: number;
  name: string;
  extraBedMax: number;
}

export default function ExtraBedInventory() {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({ totalBeds: 50, pricePerNight: "200" });

  const { data: inventory, isLoading } = useQuery<ExtraBedInventory>({
    queryKey: ["/api/admin/extra-bed-inventory"],
  });

  const { data: categories } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { totalBeds: number; pricePerNight: string }) => {
      return await apiRequest("PATCH", "/api/admin/extra-bed-inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/extra-bed-inventory"] });
      toast({
        title: "Inventory Updated",
        description: "Extra bed inventory has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update inventory.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryLimitMutation = useMutation({
    mutationFn: async (data: { categoryId: number; extraBedMax: number }) => {
      return await apiRequest("PATCH", `/api/admin/room-categories/${data.categoryId}`, { 
        extraBedMax: data.extraBedMax 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      toast({
        title: "Limit Updated",
        description: "Room category extra bed limit updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update limit.",
        variant: "destructive",
      });
    },
  });

  const handleEditOpen = () => {
    if (inventory) {
      setEditValues({
        totalBeds: inventory.totalBeds,
        pricePerNight: inventory.pricePerNight,
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveInventory = () => {
    updateInventoryMutation.mutate({
      totalBeds: editValues.totalBeds,
      pricePerNight: editValues.pricePerNight,
    });
  };

  const availableBeds = inventory ? inventory.totalBeds - inventory.bedsInUse : 0;
  const utilizationPercent = inventory ? Math.round((inventory.bedsInUse / inventory.totalBeds) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Extra Bed Inventory</h2>
          <p className="text-gray-600">Manage extra bed stock and pricing</p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleEditOpen} className="bg-orange-500 hover:bg-orange-600">
              <Settings className="h-4 w-4 mr-2" />
              Edit Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Extra Bed Inventory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="totalBeds">Total Beds in Stock</Label>
                <Input
                  id="totalBeds"
                  type="number"
                  min="0"
                  value={editValues.totalBeds}
                  onChange={(e) => setEditValues({ ...editValues, totalBeds: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="pricePerNight">Price per Night (₹)</Label>
                <Input
                  id="pricePerNight"
                  type="number"
                  min="0"
                  value={editValues.pricePerNight}
                  onChange={(e) => setEditValues({ ...editValues, pricePerNight: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveInventory}
                  disabled={updateInventoryMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {updateInventoryMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{inventory?.totalBeds || 0}</div>
            <p className="text-sm text-gray-500">extra beds available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Currently In Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{inventory?.bedsInUse || 0}</div>
            <p className="text-sm text-gray-500">{utilizationPercent}% utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              {availableBeds < 10 ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <Bed className="h-4 w-4" />
              )}
              Available Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${availableBeds < 10 ? 'text-yellow-500' : 'text-green-600'}`}>
              {availableBeds}
            </div>
            <p className="text-sm text-gray-500">beds ready to book</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Current extra bed pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-orange-500">
              ₹{inventory?.pricePerNight || "200"}
            </div>
            <div className="text-gray-600">per bed per night</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room Category Limits</CardTitle>
          <CardDescription>Maximum extra beds allowed per room type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{category.name}</div>
                  <div className="text-sm text-gray-500">
                    Max {category.extraBedMax ?? 1} extra bed{(category.extraBedMax ?? 1) !== 1 ? 's' : ''} per room
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCategoryLimitMutation.mutate({ 
                      categoryId: category.id, 
                      extraBedMax: Math.max(0, (category.extraBedMax ?? 1) - 1) 
                    })}
                    disabled={(category.extraBedMax ?? 1) === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="w-12 justify-center text-lg">
                    {category.extraBedMax ?? 1}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCategoryLimitMutation.mutate({ 
                      categoryId: category.id, 
                      extraBedMax: (category.extraBedMax ?? 1) + 1 
                    })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
