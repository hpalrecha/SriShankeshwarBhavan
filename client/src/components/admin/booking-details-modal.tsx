import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, User, Calendar, CreditCard, MapPin, Phone, Mail, ImageIcon, XCircle, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BookingWithDetails } from "@/lib/types";
import CameraCapture from "@/components/ui/camera-capture";
// Removed SimpleModal import - no longer needed

interface BookingDetailsModalProps {
  booking: BookingWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

// Removed IDProofViewer component - now opening images directly in new tab

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roomNumber, setRoomNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [status, setStatus] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  // Removed viewingProof state - now opening images in new tab

  // Removed all viewingProof-related code since images now open in new tabs

  const { data: idProofs, isLoading: idProofsLoading } = useQuery({
    queryKey: [`/api/admin/id-proofs/${booking?.booking.id}`],
    enabled: !!booking?.booking.id,
    refetchOnWindowFocus: false,
  });



  const updateBookingMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PATCH", `/api/admin/bookings/${booking?.booking.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/todays-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({
        title: "Booking Updated",
        description: "Booking has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadIdProofMutation = useMutation({
    mutationFn: async (file: File) => {
      // Create FormData for actual file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookingId', booking?.booking.id?.toString() || '');
      formData.append('idType', 'government_id');
      formData.append('guestName', booking?.user.name || '');

      // Use fetch directly for file uploads
      const response = await fetch("/api/admin/id-proofs", {
        method: "POST",
        body: formData, // Don't set Content-Type header - let browser set it with boundary
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/id-proofs/${booking?.booking.id}`] });
      toast({
        title: "ID Proof Uploaded",
        description: "Guest ID proof has been successfully uploaded.",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload ID proof. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (field: string, value: string) => {
    updateBookingMutation.mutate({ [field]: value });
  };

  const handleIdProofUpload = async () => {
    if (selectedFiles.length > 0) {
      // Upload all selected files
      for (const file of selectedFiles) {
        try {
          await uploadIdProofMutation.mutateAsync(file);
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
        }
      }
      // Clear the file selection after successful upload
      setSelectedFiles([]);
      setCurrentFile(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = (file: File) => {
    setCurrentFile(file);
    setSelectedFiles(prev => [...prev, file]);
    setShowCameraCapture(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      checked_in: "secondary", 
      checked_out: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "secondary",
      unpaid: "destructive",
      pending: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (!booking) return null;

  const checkinDate = new Date(booking.booking.checkinDate);
  const checkoutDate = new Date(booking.booking.checkoutDate);
  const nights = Math.max(1, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details - {booking.booking.bookingId}</span>
            <div className="flex gap-2">
              {getStatusBadge(booking.booking.status)}
              {getPaymentStatusBadge(booking.booking.paymentStatus)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{booking.user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{booking.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{booking.user.mobile}</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Guests: {booking.booking.guests}</p>
                <p className="text-sm text-gray-600">Rooms Booked: {booking.booking.roomsBooked || 1}</p>
              </div>
              
              {/* Primary Guest Details */}
              {booking.booking.primaryGuestName && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Primary Guest Details</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{booking.booking.primaryGuestName}</p>
                    </div>
                    {booking.booking.primaryGuestEmail && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{booking.booking.primaryGuestEmail}</p>
                      </div>
                    )}
                    {booking.booking.primaryGuestPhone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{booking.booking.primaryGuestPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Room Category</p>
                <p className="font-medium">{booking.category.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">{checkinDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">{checkoutDate.toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{nights} night{nights > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium">{booking.booking.paymentMethod || 'Not specified'}</p>
              </div>
              
              {/* Payment Reference */}
              {booking.booking.paymentReference && (
                <div>
                  <p className="text-sm text-gray-600">Payment Reference</p>
                  <p className="font-medium">{booking.booking.paymentReference}</p>
                </div>
              )}
              
              {/* Total Amount */}
              <div>
                <p className="text-sm text-gray-600">Room Donation</p>
                <p className="font-medium">₹{parseFloat(booking.booking.totalAmount || '0').toFixed(2)}</p>
              </div>
              
              {/* Food Amount */}
              {booking.booking.foodAmount && parseFloat(booking.booking.foodAmount) > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Food Donation</p>
                  <p className="font-medium">₹{parseFloat(booking.booking.foodAmount).toFixed(2)}</p>
                </div>
              )}
              
              {/* Actual Check-in/Check-out Times */}
              {booking.booking.actualCheckinTime && (
                <div>
                  <p className="text-sm text-gray-600">Actual Check-in Time</p>
                  <p className="font-medium text-green-600">
                    {new Date(booking.booking.actualCheckinTime).toLocaleString()}
                  </p>
                </div>
              )}
              
              {booking.booking.actualCheckoutTime && (
                <div>
                  <p className="text-sm text-gray-600">Actual Check-out Time</p>
                  <p className="font-medium text-blue-600">
                    {new Date(booking.booking.actualCheckoutTime).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          {(booking.booking.addressLine1 || booking.booking.city || booking.booking.state) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.booking.addressLine1 && (
                  <div>
                    <p className="text-sm text-gray-600">Address Line 1</p>
                    <p className="font-medium">{booking.booking.addressLine1}</p>
                  </div>
                )}
                {booking.booking.addressLine2 && (
                  <div>
                    <p className="text-sm text-gray-600">Address Line 2</p>
                    <p className="font-medium">{booking.booking.addressLine2}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {booking.booking.city && (
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-medium">{booking.booking.city}</p>
                    </div>
                  )}
                  {booking.booking.state && (
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-medium">{booking.booking.state}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {booking.booking.pinCode && (
                    <div>
                      <p className="text-sm text-gray-600">PIN Code</p>
                      <p className="font-medium">{booking.booking.pinCode}</p>
                    </div>
                  )}
                  {booking.booking.country && (
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium">{booking.booking.country}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Travel Information */}
          {(booking.booking.arrivingFrom || booking.booking.goingTo) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Travel Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.booking.arrivingFrom && (
                  <div>
                    <p className="text-sm text-gray-600">Arriving From</p>
                    <p className="font-medium">{booking.booking.arrivingFrom}</p>
                  </div>
                )}
                {booking.booking.goingTo && (
                  <div>
                    <p className="text-sm text-gray-600">Going To</p>
                    <p className="font-medium">{booking.booking.goingTo}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {booking.booking.eta && (
                    <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                      <p className="text-sm text-gray-600">Estimated Arrival Time (ETA)</p>
                      <p className="font-medium text-green-800">{booking.booking.eta}</p>
                    </div>
                  )}
                  {booking.booking.etd && (
                    <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                      <p className="text-sm text-gray-600">Estimated Departure Time (ETD)</p>
                      <p className="font-medium text-blue-800">{booking.booking.etd}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Food Booking Information */}
          {(booking.booking.foodBreakfast || booking.booking.foodLunch || booking.booking.foodDinner || 
            (booking.booking.breakfastDays && booking.booking.breakfastDays > 0) || 
            (booking.booking.lunchDays && booking.booking.lunchDays > 0) || 
            (booking.booking.dinnerDays && booking.booking.dinnerDays > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Food Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {/* Breakfast */}
                  {(booking.booking.foodBreakfast || (booking.booking.breakfastDays && booking.booking.breakfastDays > 0)) && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <div>
                        <span className="font-medium text-yellow-800">Breakfast</span>
                        {booking.booking.breakfastDays && booking.booking.breakfastDays > 0 && (
                          <div className="text-sm text-yellow-600">
                            {booking.booking.breakfastDays} day{booking.booking.breakfastDays > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <span className="text-green-600 font-medium bg-white px-2 py-1 rounded">Booked</span>
                    </div>
                  )}
                  
                  {/* Lunch */}
                  {(booking.booking.foodLunch || (booking.booking.lunchDays && booking.booking.lunchDays > 0)) && (
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                      <div>
                        <span className="font-medium text-orange-800">Lunch</span>
                        {booking.booking.lunchDays && booking.booking.lunchDays > 0 && (
                          <div className="text-sm text-orange-600">
                            {booking.booking.lunchDays} day{booking.booking.lunchDays > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <span className="text-green-600 font-medium bg-white px-2 py-1 rounded">Booked</span>
                    </div>
                  )}
                  
                  {/* Dinner */}
                  {(booking.booking.foodDinner || (booking.booking.dinnerDays && booking.booking.dinnerDays > 0)) && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                      <div>
                        <span className="font-medium text-blue-800">Dinner</span>
                        {booking.booking.dinnerDays && booking.booking.dinnerDays > 0 && (
                          <div className="text-sm text-blue-600">
                            {booking.booking.dinnerDays} day{booking.booking.dinnerDays > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <span className="text-green-600 font-medium bg-white px-2 py-1 rounded">Booked</span>
                    </div>
                  )}
                </div>
                {booking.booking.foodAmount && parseFloat(booking.booking.foodAmount) > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-medium bg-green-50 p-3 rounded">
                      <span className="text-green-800">Total Food Donation:</span>
                      <span className="text-green-600 text-lg">₹{parseFloat(booking.booking.foodAmount).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="roomNumber"
                    value={roomNumber || booking.booking.roomNumber || ""}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 101, 102"
                  />
                  <Button 
                    onClick={() => handleUpdate("roomNumber", roomNumber)}
                    disabled={updateBookingMutation.isPending}
                    size="sm"
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Booking Status</Label>
                <Select
                  value={status || booking.booking.status}
                  onValueChange={(value) => {
                    setStatus(value);
                    handleUpdate("status", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={paymentStatus || booking.booking.paymentStatus}
                  onValueChange={(value) => {
                    setPaymentStatus(value);
                    handleUpdate("paymentStatus", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cancel Booking Section - Only show for confirmed bookings, not checked-in guests */}
              {booking.booking.status === 'confirmed' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-red-600 font-medium">Booking Actions</Label>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                        handleUpdate("status", "cancelled");
                      }
                    }}
                    disabled={updateBookingMutation.isPending}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                  <p className="text-xs text-gray-500">
                    This will mark the booking as cancelled and may trigger refund processing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ID Proof Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                ID Proof Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idProof">Upload Guest ID Proof (Aadhaar Card)</Label>
                <div className="flex gap-2">
                  <Input
                    id="idProof"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCurrentFile(file);
                        setSelectedFiles(prev => [...prev, file]);
                      }
                      // Clear the input so the same file can be selected again
                      e.target.value = '';
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleIdProofUpload}
                    disabled={selectedFiles.length === 0 || uploadIdProofMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
                  </Button>
                  <Button 
                    onClick={() => setShowCameraCapture(true)}
                    disabled={uploadIdProofMutation.isPending}
                    size="sm"
                    className="bg-brand-orange hover:bg-brand-orange/90"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Camera
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Select files one by one to add them to the upload queue. Click "Camera" to capture Aadhaar photo directly.
                </p>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Files to Upload ({selectedFiles.length})</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
                          <span className="truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Uploaded ID Proofs {Array.isArray(idProofs) ? `(${idProofs.length})` : ''}</Label>
                {idProofsLoading ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading ID proofs...
                  </div>
                ) : Array.isArray(idProofs) && idProofs.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(idProofs as any[]).map((proof: any) => (
                      <div key={proof.id} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{proof.fileName}</div>
                          <div className="text-xs text-gray-500">
                            {proof.guestName && `Guest: ${proof.guestName}`}
                            {proof.uploadedAt && ` • ${new Date(proof.uploadedAt).toLocaleString()}`}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Opening image in new tab:', proof.filePath);
                            window.open(proof.filePath, '_blank');
                          }}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded">
                    No ID proofs uploaded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Room Rate</p>
                <p className="font-medium">₹{booking.category.price}/night</p>
              </div>
              <div>
                <p className="text-gray-600">Nights</p>
                <p className="font-medium">{nights}</p>
              </div>
              <div>
                <p className="text-gray-600">Rooms</p>
                <p className="font-medium">{booking.booking.roomsBooked || 1}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-bold text-lg text-brand-orange">₹{parseFloat(booking.booking.totalAmount).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={showCameraCapture}
          onClose={() => setShowCameraCapture(false)}
          onCapture={handleCameraCapture}
          title="Capture Aadhaar Card"
        />
        </div>
      </DialogContent>
    </Dialog>

      {/* ID Proof images now open in new tab - no modal needed */}
    </>
  );
}