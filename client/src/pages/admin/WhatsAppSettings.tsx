import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Settings, MessageSquare, TestTube, Trash2, Edit, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const whatsAppConfigSchema = z.object({
  accessToken: z.string().min(1, "Access Token is required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  businessAccountId: z.string().min(1, "Business Account ID is required"),
  webhookVerifyToken: z.string().optional(),
  isEnabled: z.boolean(),
});

const templateSchema = z.object({
  notificationType: z.enum(['booking_confirmation', 'booking_cancellation', 'pre_checkin_reminder', 'checkin_day_welcome', 'post_checkout_feedback']),
  templateName: z.string().min(1, "Template Name is required"),
  isActive: z.boolean(),
});

type WhatsAppConfigForm = z.infer<typeof whatsAppConfigSchema>;
type TemplateForm = z.infer<typeof templateSchema>;

const notificationTypeLabels = {
  booking_confirmation: "Booking Confirmation",
  booking_cancellation: "Booking Cancellation",
  pre_checkin_reminder: "Pre Check-in Reminder",
  checkin_day_welcome: "Check-in Day Welcome",
  post_checkout_feedback: "Post Checkout Feedback",
};

export default function WhatsAppSettings() {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch WhatsApp configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["/api/whatsapp/config"],
  });

  // Fetch WhatsApp template mappings (local database)
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/whatsapp/templates"],
  });

  // Fetch WhatsApp templates from Meta API
  const { data: metaTemplates, isLoading: metaTemplatesLoading, refetch: refetchMetaTemplates } = useQuery({
    queryKey: ["/api/whatsapp/templates/meta"],
    enabled: false, // Only fetch when manually triggered
  });

  // Configuration form
  const configForm = useForm<WhatsAppConfigForm>({
    resolver: zodResolver(whatsAppConfigSchema),
    defaultValues: {
      accessToken: "",
      phoneNumberId: "",
      businessAccountId: "",
      webhookVerifyToken: "",
      isEnabled: false,
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      configForm.reset({
        accessToken: config.accessToken || "",
        phoneNumberId: config.phoneNumberId || "",
        businessAccountId: config.businessAccountId || "",
        webhookVerifyToken: config.webhookVerifyToken || "",
        isEnabled: config.isEnabled || false,
      });
    }
  }, [config, configForm]);

  // Template form
  const templateForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      notificationType: "booking_confirmation",
      templateName: "",
      isActive: true,
    },
  });

  // Config update mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: WhatsAppConfigForm) => {
      return await apiRequest("POST", "/api/whatsapp/config", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "WhatsApp configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update WhatsApp configuration",
        variant: "destructive",
      });
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      return await apiRequest("POST", "/api/whatsapp/templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template mapping created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      templateForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template mapping",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<TemplateForm>) => {
      return await apiRequest("PUT", `/api/whatsapp/templates/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template mapping updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template mapping",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/whatsapp/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template mapping deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template mapping",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/whatsapp/test-connection");
    },
    onSuccess: (response: any) => {
      toast({
        title: "Connection Test",
        description: response.message || "WhatsApp connection test completed",
        variant: response.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test WhatsApp connection",
        variant: "destructive",
      });
    },
  });

  const onSubmitConfig = (data: WhatsAppConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  const onSubmitTemplate = (data: TemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  if (configLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure WhatsApp Business API and template mappings</p>
        </div>
        <Button
          onClick={() => testConnectionMutation.mutate()}
          disabled={testConnectionMutation.isPending}
          variant="outline"
          className="flex items-center gap-2"
        >
          <TestTube className="h-4 w-4" />
          {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
        </Button>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Template Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                WhatsApp Business API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onSubmitConfig)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="accessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter your WhatsApp Business API access token"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={configForm.control}
                      name="phoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your WhatsApp phone number ID"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={configForm.control}
                      name="businessAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Account ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your WhatsApp Business Account ID"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={configForm.control}
                      name="webhookVerifyToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook Verify Token (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Only needed for receiving messages (optional)"
                            />
                          </FormControl>
                          <p className="text-sm text-gray-500">
                            Not required for sending template messages
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={configForm.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable WhatsApp Notifications</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Turn on WhatsApp notifications for booking events
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateConfigMutation.isPending}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-4">
            {/* Meta Templates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Available Templates from Meta
                  </span>
                  <Button
                    onClick={() => refetchMetaTemplates()}
                    disabled={metaTemplatesLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${metaTemplatesLoading ? 'animate-spin' : ''}`} />
                    {metaTemplatesLoading ? "Loading..." : "Fetch Templates"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metaTemplatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : metaTemplates && metaTemplates.length > 0 ? (
                  <div className="space-y-2">
                    {metaTemplates.map((template: any) => (
                      <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-gray-500">
                            Status: <Badge variant={template.status === 'APPROVED' ? 'default' : 'secondary'}>
                              {template.status}
                            </Badge>
                          </p>
                          <p className="text-sm text-gray-500">Language: {template.language}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Click "Fetch Templates" to load your approved templates from Meta
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Mappings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Template Mappings for Notifications
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Template Mapping
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Template Mapping</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          Map notification types to your Meta-approved WhatsApp templates
                          {(!metaTemplates || metaTemplates.filter((t: any) => t.status === 'APPROVED').length === 0) && (
                            <span className="block mt-1 text-orange-600">
                              {!metaTemplates ? "Please fetch templates from Meta first using the \"Fetch Templates\" button above" : "No approved templates found. Please create and approve templates in Meta Business Manager first."}
                            </span>
                          )}
                        </p>
                      </DialogHeader>
                      <Form {...templateForm}>
                        <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                          <FormField
                            control={templateForm.control}
                            name="notificationType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notification Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select notification type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(notificationTypeLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="templateName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template Name (from Meta)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Meta template" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {metaTemplates && metaTemplates.length > 0 ? (
                                      metaTemplates
                                        .filter((template: any) => template.status === 'APPROVED')
                                        .map((template: any) => (
                                          <SelectItem key={template.id} value={template.name}>
                                            {template.name}
                                          </SelectItem>
                                        ))
                                    ) : (
                                      <SelectItem value="no-templates" disabled>
                                        No approved templates found. Click "Fetch Templates" first.
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Active</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Enable this template mapping
                                  </p>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              type="submit"
                              disabled={createTemplateMutation.isPending || !metaTemplates || metaTemplates.filter((t: any) => t.status === 'APPROVED').length === 0}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {createTemplateMutation.isPending ? "Creating..." : "Create Template Mapping"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates && templates.length > 0 ? (
                    templates.map((template: any) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {notificationTypeLabels[template.notificationType as keyof typeof notificationTypeLabels]}
                            </Badge>
                            {template.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-600">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Template: <span className="font-mono">{template.templateName}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No template mappings configured yet. Add your first template mapping to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p><strong>Before using WhatsApp templates:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Create message templates in Meta Business Manager</li>
                    <li>Get templates approved by Meta (this can take 24-48 hours)</li>
                    <li>Use the exact approved template name in the mapping above</li>
                    <li>Templates must follow Meta's guidelines for business communications</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Template Parameters:</strong> Our system automatically passes relevant booking
                    information (guest name, booking ID, dates, etc.) to your templates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template Mapping</DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="notificationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Type</FormLabel>
                      <Select onValueChange={field.onChange} value={editingTemplate.notificationType}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(notificationTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="templateName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name (from Meta)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          defaultValue={editingTemplate.templateName}
                          placeholder="Enter Meta-approved template name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Enable this template mapping
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? editingTemplate.isActive}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}