import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Plus, Edit, Bed, Users, DollarSign, Trash2, Upload, Image as ImageIcon, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoomCategory } from "@shared/schema";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid price"),
  totalUnits: z.number().min(1, "Must have at least 1 room"),
  maxOccupancy: z.number().min(1, "At least 1 person capacity required").max(10, "Maximum 10 people allowed"),
  bedConfiguration: z.string().min(1, "Bed configuration is required"),
  imageUrl: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// Simple availability display component to fix the display issue
function AvailabilityDisplay({ 
  category, 
  checkinDate, 
  checkoutDate, 
  availabilityData, 
  isLoading 
}: {
  category: RoomCategory;
  checkinDate: Date | undefined;
  checkoutDate: Date | undefined;
  availabilityData: any;
  isLoading: boolean;
}) {
  const hasValidDates = checkinDate && checkoutDate;
  
  console.log(`AVAILABILITY DEBUG - Category ${category.id} (${category.name}):`, {
    availabilityData,
    categoryData: availabilityData?.[category.id],
    hasValidDates,
    isLoading,
    categoryIdType: typeof category.id,
    availabilityKeys: availabilityData ? Object.keys(availabilityData) : 'no data'
  });
  
  let displayText = `${category.totalUnits} / ${category.totalUnits}`;
  let descriptionText = 'All rooms available for selected dates';
  
  if (hasValidDates && !isLoading && availabilityData) {
    const categoryData = availabilityData[category.id];
    if (categoryData && typeof categoryData.available === 'number') {
      displayText = `${categoryData.available} / ${category.totalUnits}`;
      descriptionText = categoryData.available === category.totalUnits 
        ? 'All rooms available for selected dates'
        : `${categoryData.booked} rooms booked for selected dates`;
    }
  }
  
  return (
    <div className={`mt-3 p-3 rounded-lg border ${
      !hasValidDates ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex justify-between items-center">
        <p className={`text-sm font-medium ${
          !hasValidDates ? 'text-blue-800' : 'text-green-800'
        }`}>
          {hasValidDates 
            ? `Availability (${format(checkinDate!, "MMM dd")} - ${format(checkoutDate!, "MMM dd")})` 
            : 'Select dates to check availability'
          }
        </p>
        
        {!hasValidDates ? (
          <p className="text-sm text-blue-600 font-medium">Select dates above</p>
        ) : (
          <p className="text-lg font-bold text-green-600">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-brand-orange border-t-transparent rounded-full"></div>
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              displayText
            )}
          </p>
        )}
      </div>
      <p className={`text-xs mt-1 ${!hasValidDates ? 'text-blue-600' : 'text-green-600'}`}>
        {!hasValidDates 
          ? 'Choose check-in and check-out dates to see availability'
          : isLoading 
            ? 'Checking availability...'
            : descriptionText
        }
      </p>
    </div>
  );
}

export default function InventoryManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  
  // Date-based availability checker states - set default to today and tomorrow
  const [checkinDate, setCheckinDate] = useState<Date>(() => new Date());
  const [checkoutDate, setCheckoutDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  const { data: categories = [], isLoading } = useQuery<RoomCategory[]>({
    queryKey: ["/api/room-categories"],
  });

  // Get availability data - fresh data without caching
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/rooms/availability-admin", checkinDate?.toISOString().split('T')[0], checkoutDate?.toISOString().split('T')[0]],
    enabled: !!checkinDate && !!checkoutDate,
    staleTime: 0,
    queryFn: async () => {
      if (!checkinDate || !checkoutDate) return {};
      
      const response = await apiRequest("POST", "/api/rooms/availability", {
        checkinDate: checkinDate.toISOString().split('T')[0],
        checkoutDate: checkoutDate.toISOString().split('T')[0]
      });
      
      console.log("Fresh API Response:", response);
      return response as Record<number, { available: number; booked: number }>;
    }
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      totalUnits: 1,
      maxOccupancy: 2,
      bedConfiguration: "1 Double Bed",
      imageUrl: "",
    },
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch("/api/admin/room-category-image", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      let finalData = { ...data };
      
      // Upload image if selected
      if (selectedImage) {
        const imageResult = await uploadImageMutation.mutateAsync(selectedImage);
        finalData.imageUrl = imageResult.imageUrl;
      }
      
      const response = await apiRequest("POST", "/api/admin/room-categories", finalData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedImage(null);
      setImagePreview("");
      toast({
        title: "Room category created",
        description: "New room category has been added successfully.",
      });
    },
    onError: (error) => {
      console.error("Creation error:", error);
      toast({
        title: "Creation failed",
        description: error.message || "Unable to create room category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<CategoryFormData> }) => {
      let finalUpdates = { ...data.updates };
      
      // Upload image if selected
      if (selectedImage) {
        const imageResult = await uploadImageMutation.mutateAsync(selectedImage);
        finalUpdates.imageUrl = imageResult.imageUrl;
      } else if (!imagePreview && editingCategory?.imageUrl) {
        // If no image preview and we had an image before, remove it
        finalUpdates.imageUrl = '';
      }
      
      const response = await apiRequest("PATCH", `/api/admin/room-categories/${data.id}`, finalUpdates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
      setSelectedImage(null);
      setImagePreview("");
      toast({
        title: "Room category updated",
        description: "Room category has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Unable to update room category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/room-categories/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-categories"] });
      toast({
        title: "Room category deleted",
        description: "Room category has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Unable to delete room category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (category: RoomCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      price: category.price,
      totalUnits: category.totalUnits,
      maxOccupancy: category.maxOccupancy || 2,
      bedConfiguration: category.bedConfiguration || "1 Double Bed",
      imageUrl: category.imageUrl || "",
    });
    // Set existing image preview if available
    if (category.imageUrl) {
      setImagePreview(category.imageUrl);
    } else {
      setImagePreview("");
    }
    setSelectedImage(null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    // Clear the form field as well
    form.setValue('imageUrl', '');
    // Clear the file input
    const fileInput = document.getElementById('room-image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        updates: data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    form.reset();
    setSelectedImage(null);
    setImagePreview("");
  };

  const handleDelete = (categoryId: number, categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(categoryId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Room Inventory</h2>
          <p className="text-gray-600">Manage room categories and availability</p>
        </div>
        

      </div>

      {/* Date Selection for Availability Check */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 items-center">
            <Label className="text-sm font-medium">Check-in:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {checkinDate ? format(checkinDate, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={checkinDate}
                  onSelect={setCheckinDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-2 items-center">
            <Label className="text-sm font-medium">Check-out:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {checkoutDate ? format(checkoutDate, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={checkoutDate}
                  onSelect={setCheckoutDate}
                  disabled={(date) => date < (checkinDate || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {checkinDate && checkoutDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Search className="h-4 w-4" />
              Showing availability for {format(checkinDate, "MMM dd")} to {format(checkoutDate, "MMM dd, yyyy")}
              {isLoadingAvailability && <div className="animate-spin h-4 w-4 border-2 border-brand-orange border-t-transparent rounded-full"></div>}
            </div>
          )}
        </div>
      </Card>
      
      <div className="flex justify-between items-center">
        <div></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-orange hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Room Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Room Category" : "Add New Room Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g. Deluxe Room"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Describe the room amenities and features..."
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* Room Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="room-image">Room Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Room preview" 
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label
                          htmlFor="room-image"
                          className="cursor-pointer text-sm font-medium text-brand-orange hover:text-orange-600"
                        >
                          <Upload className="h-4 w-4 inline mr-1" />
                          Upload room image
                        </label>
                        <input
                          id="room-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Night (₹)</Label>
                  <Input
                    id="price"
                    {...form.register("price")}
                    placeholder="2500.00"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalUnits">Total Rooms</Label>
                  <Input
                    id="totalUnits"
                    type="number"
                    {...form.register("totalUnits", { valueAsNumber: true })}
                    min="1"
                  />
                  {form.formState.errors.totalUnits && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.totalUnits.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxOccupancy">Max People</Label>
                  <Input
                    id="maxOccupancy"
                    type="number"
                    {...form.register("maxOccupancy", { valueAsNumber: true })}
                    placeholder="2"
                    min="1"
                    max="10"
                  />
                  {form.formState.errors.maxOccupancy && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.maxOccupancy.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bedConfiguration">Bed Configuration</Label>
                  <select
                    id="bedConfiguration"
                    {...form.register("bedConfiguration")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="1 Double Bed">1 Double Bed</option>
                    <option value="2 Single Beds">2 Single Beds</option>
                    <option value="1 King Bed">1 King Bed</option>
                    <option value="1 Queen Bed">1 Queen Bed</option>
                    <option value="3 Single Beds">3 Single Beds</option>
                    <option value="1 Double + 1 Single">1 Double + 1 Single</option>
                    <option value="2 Double Beds">2 Double Beds</option>
                  </select>
                  {form.formState.errors.bedConfiguration && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.bedConfiguration.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-orange hover:bg-orange-600"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category: RoomCategory) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {category.imageUrl ? (
                      <img 
                        src={category.imageUrl} 
                        alt={category.name}
                        className="w-12 h-12 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    {category.description}
                  </CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    className="p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id, category.name)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center text-brand-orange">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-semibold">₹{category.price}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-center text-brand-orange">
                    <Bed className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-600">Total Rooms</p>
                  <p className="font-semibold">{category.totalUnits}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-center text-brand-orange">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-600">Max People</p>
                  <p className="font-semibold">{category.maxOccupancy || 2}</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Bed Configuration</p>
                <p className="font-semibold text-brand-orange">{category.bedConfiguration || "1 Double Bed"}</p>
              </div>
              
              <AvailabilityDisplay 
                category={category}
                checkinDate={checkinDate}
                checkoutDate={checkoutDate}
                availabilityData={availabilityData}
                isLoading={isLoadingAvailability}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Bed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No room categories</h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first room category to manage inventory.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-orange hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room Category
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}