import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Settings, Trash2, Eye, EyeOff } from "lucide-react";

interface PaymentGateway {
  id: number;
  gatewayName: string;
  displayName: string;
  isActive: boolean;
  isTestMode: boolean;
  publicKey?: string;
  secretKey?: string;
  merchantId?: string;
  merchantKey?: string;
  webhookSecret?: string;
  supportedCurrencies: string;
  minimumAmount: string;
  maximumAmount?: string;
  processingFee: string;
  createdAt: string;
  updatedAt: string;
}

const gatewayTemplates = {
  razorpay: {
    displayName: "Razorpay",
    supportedCurrencies: '["INR"]',
    minimumAmount: "1.00",
    processingFee: "2.00",
    fields: ["publicKey", "secretKey", "webhookSecret"]
  },
  payu: {
    displayName: "PayU",
    supportedCurrencies: '["INR"]',
    minimumAmount: "1.00", 
    processingFee: "2.50",
    fields: ["publicKey", "merchantId", "merchantKey"]
  },
  stripe: {
    displayName: "Stripe",
    supportedCurrencies: '["INR", "USD"]',
    minimumAmount: "0.50",
    processingFee: "2.90",
    fields: ["publicKey", "secretKey", "webhookSecret"]
  },
  paypal: {
    displayName: "PayPal",
    supportedCurrencies: '["USD", "INR"]',
    minimumAmount: "1.00",
    processingFee: "3.49",
    fields: ["publicKey", "secretKey"]
  }
};

export default function PaymentGatewaySettings() {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gateways = [], isLoading } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/admin/payment-gateways"],
  });

  const createGatewayMutation = useMutation({
    mutationFn: async (gateway: Partial<PaymentGateway>) => {
      await apiRequest("POST", "/api/admin/payment-gateways", gateway);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setIsDialogOpen(false);
      setEditingGateway(null);
      toast({
        title: "Success",
        description: "Payment gateway configured successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure payment gateway",
        variant: "destructive",
      });
    },
  });

  const updateGatewayMutation = useMutation({
    mutationFn: async (gateway: PaymentGateway) => {
      await apiRequest("PUT", `/api/admin/payment-gateways/${gateway.id}`, gateway);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setIsDialogOpen(false);
      setEditingGateway(null);
      toast({
        title: "Success",
        description: "Payment gateway updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update payment gateway",
        variant: "destructive",
      });
    },
  });

  const deleteGatewayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/payment-gateways/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      toast({
        title: "Success",
        description: "Payment gateway deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment gateway",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const gatewayData = {
      gatewayName: formData.get("gatewayName") as string,
      displayName: formData.get("displayName") as string,
      isActive: formData.get("isActive") === "on",
      isTestMode: formData.get("isTestMode") === "on",
      publicKey: formData.get("publicKey") as string,
      secretKey: formData.get("secretKey") as string,
      merchantId: formData.get("merchantId") as string,
      merchantKey: formData.get("merchantKey") as string,
      webhookSecret: formData.get("webhookSecret") as string,
      supportedCurrencies: formData.get("supportedCurrencies") as string,
      minimumAmount: formData.get("minimumAmount") as string,
      maximumAmount: formData.get("maximumAmount") as string || undefined,
      processingFee: formData.get("processingFee") as string,
    };

    if (editingGateway) {
      updateGatewayMutation.mutate({ ...editingGateway, ...gatewayData });
    } else {
      createGatewayMutation.mutate(gatewayData);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const applyTemplate = (gatewayName: string) => {
    const template = gatewayTemplates[gatewayName as keyof typeof gatewayTemplates];
    if (template) {
      setEditingGateway(prev => ({
        ...prev!,
        gatewayName,
        displayName: template.displayName,
        supportedCurrencies: template.supportedCurrencies,
        minimumAmount: template.minimumAmount,
        processingFee: template.processingFee,
      }));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading payment gateways...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Gateway Settings</h2>
          <p className="text-muted-foreground">Configure online payment gateways for donations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingGateway({
                  id: 0,
                  gatewayName: "",
                  displayName: "",
                  isActive: false,
                  isTestMode: true,
                  supportedCurrencies: '["INR"]',
                  minimumAmount: "1.00",
                  processingFee: "2.00",
                } as PaymentGateway);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Gateway
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGateway?.id ? "Edit" : "Add"} Payment Gateway
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gatewayName">Gateway Type</Label>
                  <Select 
                    name="gatewayName" 
                    value={editingGateway?.gatewayName || ""}
                    onValueChange={(value) => {
                      applyTemplate(value);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                      <SelectItem value="payu">PayU</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    name="displayName"
                    value={editingGateway?.displayName || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, displayName: e.target.value} : null)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    name="isActive"
                    checked={editingGateway?.isActive || false}
                    onCheckedChange={(checked) => setEditingGateway(prev => prev ? {...prev, isActive: checked} : null)}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    name="isTestMode"
                    checked={editingGateway?.isTestMode ?? true}
                    onCheckedChange={(checked) => setEditingGateway(prev => prev ? {...prev, isTestMode: checked} : null)}
                  />
                  <Label>Test Mode</Label>
                </div>
              </div>

              {/* Gateway-specific credential fields */}
              {gatewayTemplates[editingGateway?.gatewayName as keyof typeof gatewayTemplates]?.fields.includes("publicKey") && (
                <div>
                  <Label htmlFor="publicKey">Public Key / Key ID</Label>
                  <Input
                    name="publicKey"
                    type="text"
                    value={editingGateway?.publicKey || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, publicKey: e.target.value} : null)}
                    placeholder="Enter public key or key ID"
                  />
                </div>
              )}

              {gatewayTemplates[editingGateway?.gatewayName as keyof typeof gatewayTemplates]?.fields.includes("secretKey") && (
                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <div className="relative">
                    <Input
                      name="secretKey"
                      type={showPasswords.secretKey ? "text" : "password"}
                      value={editingGateway?.secretKey || ""}
                      onChange={(e) => setEditingGateway(prev => prev ? {...prev, secretKey: e.target.value} : null)}
                      placeholder="Enter secret key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility("secretKey")}
                    >
                      {showPasswords.secretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {gatewayTemplates[editingGateway?.gatewayName as keyof typeof gatewayTemplates]?.fields.includes("merchantId") && (
                <div>
                  <Label htmlFor="merchantId">Merchant ID</Label>
                  <Input
                    name="merchantId"
                    value={editingGateway?.merchantId || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, merchantId: e.target.value} : null)}
                    placeholder="Enter merchant ID"
                  />
                </div>
              )}

              {gatewayTemplates[editingGateway?.gatewayName as keyof typeof gatewayTemplates]?.fields.includes("merchantKey") && (
                <div>
                  <Label htmlFor="merchantKey">Merchant Key</Label>
                  <div className="relative">
                    <Input
                      name="merchantKey"
                      type={showPasswords.merchantKey ? "text" : "password"}
                      value={editingGateway?.merchantKey || ""}
                      onChange={(e) => setEditingGateway(prev => prev ? {...prev, merchantKey: e.target.value} : null)}
                      placeholder="Enter merchant key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility("merchantKey")}
                    >
                      {showPasswords.merchantKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {gatewayTemplates[editingGateway?.gatewayName as keyof typeof gatewayTemplates]?.fields.includes("webhookSecret") && (
                <div>
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <div className="relative">
                    <Input
                      name="webhookSecret"
                      type={showPasswords.webhookSecret ? "text" : "password"}
                      value={editingGateway?.webhookSecret || ""}
                      onChange={(e) => setEditingGateway(prev => prev ? {...prev, webhookSecret: e.target.value} : null)}
                      placeholder="Enter webhook secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility("webhookSecret")}
                    >
                      {showPasswords.webhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minimumAmount">Min Amount (₹)</Label>
                  <Input
                    name="minimumAmount"
                    type="number"
                    step="0.01"
                    value={editingGateway?.minimumAmount || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, minimumAmount: e.target.value} : null)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maximumAmount">Max Amount (₹)</Label>
                  <Input
                    name="maximumAmount"
                    type="number"
                    step="0.01"
                    value={editingGateway?.maximumAmount || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, maximumAmount: e.target.value} : null)}
                    placeholder="No limit"
                  />
                </div>
                <div>
                  <Label htmlFor="processingFee">Processing Fee (%)</Label>
                  <Input
                    name="processingFee"
                    type="number"
                    step="0.01"
                    value={editingGateway?.processingFee || ""}
                    onChange={(e) => setEditingGateway(prev => prev ? {...prev, processingFee: e.target.value} : null)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supportedCurrencies">Supported Currencies (JSON)</Label>
                <Textarea
                  name="supportedCurrencies"
                  value={editingGateway?.supportedCurrencies || '["INR"]'}
                  onChange={(e) => setEditingGateway(prev => prev ? {...prev, supportedCurrencies: e.target.value} : null)}
                  placeholder='["INR", "USD"]'
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingGateway(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createGatewayMutation.isPending || updateGatewayMutation.isPending}
                >
                  {editingGateway?.id ? "Update" : "Create"} Gateway
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {gateways.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No payment gateways configured yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add a payment gateway to enable online donations.
              </p>
            </CardContent>
          </Card>
        ) : (
          gateways.map((gateway: PaymentGateway) => (
            <Card key={gateway.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {gateway.displayName}
                      {gateway.isActive ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                      {gateway.isTestMode && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Test Mode
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {gateway.gatewayName.toUpperCase()} • Min: ₹{gateway.minimumAmount} • Fee: {gateway.processingFee}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingGateway(gateway);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this payment gateway?")) {
                          deleteGatewayMutation.mutate(gateway.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Public Key:</strong> {gateway.publicKey ? "••••••••" : "Not set"}
                  </div>
                  <div>
                    <strong>Secret Key:</strong> {gateway.secretKey ? "••••••••" : "Not set"}
                  </div>
                  {gateway.merchantId && (
                    <div>
                      <strong>Merchant ID:</strong> {gateway.merchantId}
                    </div>
                  )}
                  <div>
                    <strong>Currencies:</strong> {JSON.parse(gateway.supportedCurrencies || '[]').join(', ')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}