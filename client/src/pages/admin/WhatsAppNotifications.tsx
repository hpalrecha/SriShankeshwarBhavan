import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Phone, Bell, MessageSquare } from "lucide-react";

const recipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  receiveDailyReport: z.boolean(),
  receiveSoldOutAlert: z.boolean(),
  isActive: z.boolean(),
});

type RecipientForm = z.infer<typeof recipientSchema>;

interface WhatsAppNotificationRecipient {
  id: number;
  name: string;
  phoneNumber: string;
  receiveDailyReport: boolean;
  receiveSoldOutAlert: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WhatsAppNotifications() {
  const [editingRecipient, setEditingRecipient] = useState<WhatsAppNotificationRecipient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch recipients
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ["/api/whatsapp/recipients"],
  });

  // Form setup
  const form = useForm<RecipientForm>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      receiveDailyReport: true,
      receiveSoldOutAlert: true,
      isActive: true,
    },
  });

  // Reset form when editing changes
  const resetForm = (recipient?: WhatsAppNotificationRecipient) => {
    if (recipient) {
      form.reset({
        name: recipient.name,
        phoneNumber: recipient.phoneNumber,
        receiveDailyReport: recipient.receiveDailyReport,
        receiveSoldOutAlert: recipient.receiveSoldOutAlert,
        isActive: recipient.isActive,
      });
    } else {
      form.reset({
        name: "",
        phoneNumber: "",
        receiveDailyReport: true,
        receiveSoldOutAlert: true,
        isActive: true,
      });
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: RecipientForm) => apiRequest("POST", "/api/whatsapp/recipients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/recipients"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Notification recipient created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecipientForm }) =>
      apiRequest("PUT", `/api/whatsapp/recipients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/recipients"] });
      setDialogOpen(false);
      setEditingRecipient(null);
      resetForm();
      toast({
        title: "Success",
        description: "Notification recipient updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/whatsapp/recipients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/recipients"] });
      toast({
        title: "Success",
        description: "Notification recipient deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecipientForm) => {
    if (editingRecipient) {
      updateMutation.mutate({ id: editingRecipient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (recipient: WhatsAppNotificationRecipient) => {
    setEditingRecipient(recipient);
    resetForm(recipient);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingRecipient(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this recipient?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("91") && phone.length === 12) {
      return `+91 ${phone.substring(2, 7)} ${phone.substring(7)}`;
    }
    return phone;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Manage recipients for daily room reports and sold-out alerts
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Recipient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRecipient ? "Edit Recipient" : "Add Recipient"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter recipient name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter phone number (e.g., 9876543210)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiveDailyReport"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Receive Daily Room Reports</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiveSoldOutAlert"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Receive Sold Out Alerts</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingRecipient ? "Update" : "Create"} Recipient
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipients.length}</div>
            <p className="text-xs text-muted-foreground">
              {recipients.filter((r: WhatsAppNotificationRecipient) => r.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Reports</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipients.filter((r: WhatsAppNotificationRecipient) => r.receiveDailyReport && r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Recipients subscribed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Out Alerts</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipients.filter((r: WhatsAppNotificationRecipient) => r.receiveSoldOutAlert && r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Recipients subscribed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients List */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Recipients</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure who receives daily room reports and sold-out alerts
          </p>
        </CardHeader>
        <CardContent>
          {recipientsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recipients configured yet. Add your first recipient to start receiving WhatsApp notifications.
            </div>
          ) : (
            <div className="space-y-4">
              {recipients.map((recipient: WhatsAppNotificationRecipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{recipient.name}</h3>
                      {!recipient.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      {formatPhoneNumber(recipient.phoneNumber)}
                    </div>
                    <div className="flex gap-2">
                      {recipient.receiveDailyReport && (
                        <Badge variant="outline" className="text-xs">
                          <Bell className="w-3 h-3 mr-1" />
                          Daily Reports
                        </Badge>
                      )}
                      {recipient.receiveSoldOutAlert && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Sold Out Alerts
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(recipient)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(recipient.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notification Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Bell className="w-4 h-4 mt-0.5 text-blue-500" />
              <div>
                <div className="font-medium">Daily Room Reports</div>
                <div className="text-muted-foreground">
                  Sent at 7:00 PM daily with next day's room availability, bookings, and guest count
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 mt-0.5 text-red-500" />
              <div>
                <div className="font-medium">Sold Out Alerts</div>
                <div className="text-muted-foreground">
                  Sent every 4 hours when any date in the next 7 days reaches 100% occupancy
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}