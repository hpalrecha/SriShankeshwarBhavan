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
import SimpleModal from "@/components/ui/simple-modal";

interface BookingDetailsModalProps {
  booking: BookingWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roomNumber, setRoomNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [status, setStatus] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [viewingProof, setViewingProof] = useState<any>(null);

  // Debug logging only when viewingProof changes
  React.useEffect(() => {
    if (viewingProof) {
      console.log('ID Proof viewer opened:', viewingProof);
    } else {
      console.log('ID Proof viewer closed');
    }
  }, [viewingProof]);
  
  // Reset viewingProof when modal opens/closes or booking changes
  React.useEffect(() => {
    if (!isOpen) {
      setViewingProof(null);
    }
  }, [isOpen]);

  // Reset viewingProof when booking changes
  React.useEffect(() => {
    setViewingProof(null);
  }, [booking?.booking.id]);

  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingProof) {
        console.log('Escape pressed, closing modal');
        setViewingProof(null);
      }
    };

    if (viewingProof) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [viewingProof]);

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
      // For now, we'll send the file info as JSON since we're not implementing actual file storage
      return await apiRequest("POST", "/api/admin/id-proofs", {
        bookingId: booking?.booking.id,
        fileName: file.name,
        fileType: file.type,
        idType: "government_id",
        guestName: booking?.user.name
      });
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
        description: "Failed to upload ID proof. Please try again.",
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
  const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            </CardContent>
          </Card>

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

              {/* Cancel Booking Section - Only show for non-cancelled bookings */}
              {booking.booking.status !== 'cancelled' && (
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
                            console.log('View button clicked for proof:', proof);
                            setViewingProof(proof);
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
      </DialogContent>
    </Dialog>

    {/* ID Proof Viewer Modal - Clean Simple Version */}
    <SimpleModal
      isOpen={!!viewingProof}
      onClose={() => setViewingProof(null)}
      title={viewingProof ? `${viewingProof.fileName} - ${viewingProof.guestName}` : ''}
    >
      {viewingProof && (
        <div className="text-center">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Uploaded: {new Date(viewingProof.uploadedAt).toLocaleString()}
            </p>
          </div>
          
          <div className="w-96 h-64 bg-gray-200 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 mx-auto">
            <div className="text-center text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Image Preview</p>
              <p className="text-xs">{viewingProof.fileName}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              File stored at: {viewingProof.filePath}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              In a production app, the actual image would be displayed here
            </p>
          </div>
        </div>
      )}
    </SimpleModal>
    </>
  );
}