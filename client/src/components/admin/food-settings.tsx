import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UtensilsCrossed, Save } from "lucide-react";

interface FoodSettings {
  breakfastPrice: string;
  lunchPrice: string;
  dinnerPrice: string;
}

export default function FoodSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FoodSettings>({
    breakfastPrice: "50",
    lunchPrice: "100", 
    dinnerPrice: "100"
  });

  const { data: foodSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/food-settings"],
    onSuccess: (data) => {
      if (data) {
        setSettings(data);
      }
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: FoodSettings) => {
      return await apiRequest("PATCH", "/api/admin/food-settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/food-settings"] });
      toast({
        title: "Food Settings Updated",
        description: "Food donation amounts have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update food settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof FoodSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UtensilsCrossed className="h-8 w-8 text-brand-orange" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Food Settings</h2>
          <p className="text-gray-600">Manage donation amounts for breakfast, lunch, and dinner</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Food Donation Amounts (₹)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="breakfast">Breakfast Donation</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="breakfast"
                  type="number"
                  value={settings.breakfastPrice}
                  onChange={(e) => handleInputChange('breakfastPrice', e.target.value)}
                  className="pl-8"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lunch">Lunch Donation</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="lunch"
                  type="number"
                  value={settings.lunchPrice}
                  onChange={(e) => handleInputChange('lunchPrice', e.target.value)}
                  className="pl-8"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dinner">Dinner Donation</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="dinner"
                  type="number"
                  value={settings.dinnerPrice}
                  onChange={(e) => handleInputChange('dinnerPrice', e.target.value)}
                  className="pl-8"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="bg-brand-orange hover:bg-brand-orange/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Food Donations</h3>
          <p className="text-blue-800 text-sm">
            These amounts are displayed to guests during booking as optional food donations. 
            Guests can choose to book meals during their stay to support the temple's food service operations.
            All amounts are treated as donations towards the sacred food service (prasadam).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}