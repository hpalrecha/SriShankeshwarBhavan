import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UnmatchedPayment {
  paymentId: string;
  orderId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  receipt: string | null;
  email: string | null;
  contact: string | null;
}

interface RefundNeededPayment extends UnmatchedPayment {
  bookingId: string;
  guestName: string | null;
}

interface ReconciliationResult {
  checkedFrom: string;
  checkedTo: string;
  totalCaptured: number;
  unmatchedCount: number;
  unmatched: UnmatchedPayment[];
  refundNeededCount: number;
  refundNeeded: RefundNeededPayment[];
}

const RECONCILIATION_QUERY_KEY = ["/api/admin/razorpay-reconciliation?days=14"];

// Independent cross-check against Razorpay's own records (see
// server/payment-reconciliation.ts) - this is what makes a captured-but-
// unrecorded payment visible in the dashboard instead of only being
// discoverable by chance, the same way a walk-in booking is visible because
// staff typed it in directly. A payment can be accounted for either via
// payment_transactions or via room_bookings.paymentReference - only flagged
// here if neither resolves it, or if a booking exists but a refund attempt
// on it already failed. An admin can dismiss an entry once they've decided
// no booking/refund is actually needed (e.g. a confirmed test charge) -
// dismissed payments never come back, but any genuinely new problem still
// will.
export default function PaymentReconciliationAlert() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<ReconciliationResult>({
    queryKey: RECONCILIATION_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/admin/razorpay-reconciliation?days=14");
      if (!response.ok) throw new Error("Failed to check payment reconciliation");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 0,
    retry: false,
  });

  const dismissMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("POST", "/api/admin/razorpay-reconciliation/dismiss", { paymentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEY });
      toast({ title: "Dismissed", description: "This payment won't be flagged again." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to dismiss", variant: "destructive" });
    },
  });

  if (!data || (data.unmatchedCount === 0 && data.refundNeededCount === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {data.unmatchedCount > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              {data.unmatchedCount} payment{data.unmatchedCount > 1 ? "s" : ""} captured by Razorpay with no matching booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800 mb-4">
              Razorpay confirms these were charged, but nothing in the booking system matches them. Reach out using the
              contact details below and create/attach the booking manually.
            </p>
            <div className="space-y-2">
              {data.unmatched.map((p) => (
                <div key={p.paymentId} className="bg-white border border-red-200 rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex gap-3">
                      <span className="font-medium">₹{p.amount.toFixed(2)}</span>
                      <span className="text-gray-500">{new Date(p.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      Payment ID: {p.paymentId}
                      {p.email && <> • {p.email}</>}
                      {p.contact && <> • {p.contact}</>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={dismissMutation.isPending}
                    onClick={() => dismissMutation.mutate(p.paymentId)}
                  >
                    <X className="w-4 h-4 mr-1" /> Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.refundNeededCount > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <RefreshCw className="w-5 h-5" />
              {data.refundNeededCount} booking{data.refundNeededCount > 1 ? "s" : ""} need a refund retried
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 mb-4">
              These bookings already exist and a refund was attempted, but it failed - the money hasn't actually gone
              back to the guest yet.
            </p>
            <div className="space-y-2">
              {data.refundNeeded.map((p) => (
                <div key={p.paymentId} className="bg-white border border-amber-200 rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex gap-3">
                      <span className="font-medium">₹{p.amount.toFixed(2)} — {p.bookingId}</span>
                      <span className="text-gray-500">{new Date(p.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      Payment ID: {p.paymentId}
                      {p.guestName && <> • {p.guestName}</>}
                      {p.email && <> • {p.email}</>}
                      {p.contact && <> • {p.contact}</>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={dismissMutation.isPending}
                    onClick={() => dismissMutation.mutate(p.paymentId)}
                  >
                    <X className="w-4 h-4 mr-1" /> Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
