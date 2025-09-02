import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Wallet, MapPin } from "lucide-react";

interface PaymentGateway {
  id: number;
  gatewayName: string;
  displayName: string;
  isTestMode: boolean;
  supportedCurrencies: string;
  minimumAmount: string;
  maximumAmount?: string;
  processingFee: string;
  publicKey?: string;
}

interface BookingPaymentProps {
  bookingId?: string;
  formData?: any;
  bookingData?: any;
  totalAmount: number;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export default function BookingPayment({ 
  bookingId,
  formData,
  bookingData,
  totalAmount, 
  onPaymentSuccess, 
  onPaymentError 
}: BookingPaymentProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pay_online");
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  console.log("BookingPayment component rendered with:", {
    bookingId,
    formData: !!formData,
    totalAmount,
    selectedGateway
  });

  // Fetch active payment gateways
  const { data: paymentGateways = [], isLoading } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/payment-gateways/active"],
  });

  // Auto-select gateway if only one is available
  useEffect(() => {
    if (paymentGateways.length === 1 && !selectedGateway) {
      setSelectedGateway(paymentGateways[0].gatewayName);
      console.log("Auto-selected payment gateway:", paymentGateways[0].gatewayName);
    }
  }, [paymentGateways, selectedGateway]);

  // Create payment order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { bookingId: string; gatewayName: string; amount: number }) => {
      const response = await apiRequest("POST", "/api/payment/create-order", data);
      return response;
    },
    onSuccess: (data) => {
      handleGatewayPayment(data);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      onPaymentError(error.message || "Failed to create payment order");
    },
  });

  // Payment verification mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: { transactionId: string; paymentData: any; gatewayName: string }) => {
      const response = await apiRequest("POST", "/api/payment/verify", data);
      return response;
    },
    onSuccess: () => {
      setIsProcessing(false);
      toast({
        title: "Payment Successful",
        description: "Your donation has been processed successfully!",
      });
      onPaymentSuccess();
    },
    onError: (error: any) => {
      setIsProcessing(false);
      onPaymentError(error.message || "Payment verification failed");
    },
  });

  // Handle gateway-specific payment processing
  const handleGatewayPayment = async (orderData: any) => {
    const gateway = paymentGateways.find((g: PaymentGateway) => g.gatewayName === selectedGateway);
    if (!gateway) {
      onPaymentError("Payment gateway not found");
      return;
    }

    try {
      if (gateway.gatewayName === "razorpay") {
        await handleRazorpayPayment(orderData, gateway);
      } else if (gateway.gatewayName === "payu") {
        await handlePayUPayment(orderData, gateway);
      } else if (gateway.gatewayName === "stripe") {
        await handleStripePayment(orderData, gateway);
      } else if (gateway.gatewayName === "paypal") {
        await handlePayPalPayment(orderData, gateway);
      } else if (gateway.gatewayName === "icici_bank") {
        await handleICICIPayment(orderData, gateway);
      } else {
        onPaymentError("Unsupported payment gateway");
      }
    } catch (error: any) {
      setIsProcessing(false);
      onPaymentError(error.message || "Payment processing failed");
    }
  };

  // Razorpay payment handler
  const handleRazorpayPayment = async (orderData: any, gateway: PaymentGateway) => {
    if (typeof (window as any).Razorpay === "undefined") {
      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => processRazorpayPayment(orderData, gateway);
      script.onerror = () => onPaymentError("Failed to load Razorpay");
      document.body.appendChild(script);
    } else {
      processRazorpayPayment(orderData, gateway);
    }
  };

  const processRazorpayPayment = (orderData: any, gateway: PaymentGateway) => {
    const options = {
      key: gateway.publicKey,
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: "INR",
      name: "Sri Shankeshwar Bengaluru Bhavan",
      description: `Booking Donation - ${bookingId}`,
      order_id: orderData.gatewayData.id,
      handler: (response: any) => {
        verifyPaymentMutation.mutate({
          transactionId: orderData.transactionId,
          paymentData: response,
          gatewayName: "razorpay",
        });
      },
      prefill: {
        name: "Guest",
        email: "guest@example.com",
      },
      theme: {
        color: "#f97316", // Orange theme
      },
      modal: {
        ondismiss: () => {
          setIsProcessing(false);
          onPaymentError("Payment cancelled");
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  // ICICI Bank payment handler
  const handleICICIPayment = async (orderData: any, gateway: PaymentGateway) => {
    try {
      console.log("ICICI orderData received:", orderData);
      
      // For ICICI Bank, the orderData contains the redirect URL from the create-order response
      if (orderData.gatewayData && orderData.gatewayData.redirectUrl) {
        console.log("Redirecting to ICICI payment gateway:", orderData.gatewayData.redirectUrl);
        // Redirect to ICICI payment gateway
        window.location.href = orderData.gatewayData.redirectUrl;
      } else {
        console.error("ICICI redirect URL not found in orderData:", orderData);
        onPaymentError("ICICI payment gateway redirect URL not found");
      }
    } catch (error: any) {
      console.error("ICICI payment error:", error);
      onPaymentError(error.message || "ICICI payment processing failed");
    }
  };

  // PayU payment handler
  const handlePayUPayment = async (orderData: any, gateway: PaymentGateway) => {
    // PayU typically requires form submission to their payment page
    const form = document.createElement("form");
    form.method = "POST";
    form.action = gateway.isTestMode 
      ? "https://test.payu.in/_payment" 
      : "https://secure.payu.in/_payment";

    // Add form fields
    const fields = {
      key: gateway.publicKey || "",
      txnid: orderData.gatewayData.txnid,
      amount: totalAmount.toString(),
      productinfo: `Booking Donation - ${bookingId}`,
      firstname: "Guest",
      email: "guest@example.com",
      phone: "9999999999",
      surl: `${window.location.origin}/api/payment/payu/success`,
      furl: `${window.location.origin}/api/payment/payu/failure`,
      hash: orderData.gatewayData.hash,
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Stripe payment handler (basic implementation)
  const handleStripePayment = async (orderData: any, gateway: PaymentGateway) => {
    // For Stripe, you would typically use Stripe Elements
    // This is a simplified implementation
    onPaymentError("Stripe integration not fully implemented yet");
  };

  // PayPal payment handler (basic implementation)
  const handlePayPalPayment = async (orderData: any, gateway: PaymentGateway) => {
    // For PayPal, you would typically use PayPal SDK
    // This is a simplified implementation
    onPaymentError("PayPal integration not fully implemented yet");
  };

  const handlePaymentSubmit = () => {
    console.log("Payment submit clicked with gateway:", selectedGateway);
    
    if (!selectedGateway) {
      toast({
        title: "Payment Gateway Required", 
        description: "Please select a payment gateway",
        variant: "destructive",
      });
      return;
    }

    const gateway = paymentGateways.find((g: PaymentGateway) => g.gatewayName === selectedGateway);
    if (!gateway) {
      onPaymentError("Selected payment gateway is not available");
      return;
    }

    // Check amount limits
    const minAmount = parseFloat(gateway.minimumAmount);
    const maxAmount = gateway.maximumAmount ? parseFloat(gateway.maximumAmount) : Infinity;

    if (totalAmount < minAmount) {
      onPaymentError(`Minimum donation amount is ₹${minAmount}`);
      return;
    }

    if (totalAmount > maxAmount) {
      onPaymentError(`Maximum donation amount is ₹${maxAmount}`);
      return;
    }

    setIsProcessing(true);
    // Use a temporary booking ID for payment processing if no booking exists yet
    const tempBookingId = bookingId || `TEMP_${Date.now()}`;
    
    createOrderMutation.mutate({
      bookingId: tempBookingId,
      gatewayName: selectedGateway,
      amount: totalAmount,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payment options...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Total Donation: ₹{totalAmount.toFixed(2)}</strong>
          </p>
        </div>

        {/* Gateway Selection - Show only if more than one gateway */}
        {paymentGateways.length > 1 ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Payment Gateway:</Label>
            <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway}>
              {paymentGateways.map((gateway: PaymentGateway) => (
                <div key={gateway.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={gateway.gatewayName} id={gateway.gatewayName} />
                  <Label htmlFor={gateway.gatewayName} className="cursor-pointer flex-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{gateway.displayName}</div>
                        <div className="text-xs text-gray-500">
                          Min: ₹{gateway.minimumAmount} • Fee: {gateway.processingFee}%
                          {gateway.isTestMode && " • Test Mode"}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : paymentGateways.length === 1 ? (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{paymentGateways[0].displayName}</div>
                <div className="text-sm text-gray-500">
                  Processing your payment securely
                  {paymentGateways[0].isTestMode && " • Test Mode"}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Fee: {paymentGateways[0].processingFee}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              No payment gateways are currently available. Please contact support.
            </p>
          </div>
        )}



        <Button
          onClick={handlePaymentSubmit}
          disabled={isProcessing || createOrderMutation.isPending || (!selectedGateway && paymentGateways.length > 0)}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            "Processing Payment..."
          ) : (
            `Pay ₹${totalAmount.toFixed(2)} Online`
          )}
        </Button>

        {selectedGateway && (
          <div className="text-xs text-gray-500 text-center">
            <p>You will be redirected to {paymentGateways.find(g => g.gatewayName === selectedGateway)?.displayName} to complete your donation securely.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}