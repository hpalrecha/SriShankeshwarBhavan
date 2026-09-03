import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

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

interface ReconciliationResult {
  checkedFrom: string;
  checkedTo: string;
  totalCaptured: number;
  unmatchedCount: number;
  unmatched: UnmatchedPayment[];
}

// Independent cross-check against Razorpay's own records (see
// server/payment-reconciliation.ts) - this is what makes a captured-but-
// unrecorded payment visible in the dashboard instead of only being
// discoverable by chance, the same way a walk-in booking is visible because
// staff typed it in directly.
export default function PaymentReconciliationAlert() {
  const { data } = useQuery<ReconciliationResult>({
    queryKey: ["/api/admin/razorpay-reconciliation?days=14"],
    queryFn: async () => {
      const response = await fetch("/api/admin/razorpay-reconciliation?days=14");
      if (!response.ok) throw new Error("Failed to check payment reconciliation");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 0,
    retry: false,
  });

  if (!data || data.unmatchedCount === 0) {
    return null;
  }

  return (
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
            <div key={p.paymentId} className="bg-white border border-red-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">₹{p.amount.toFixed(2)}</span>
                <span className="text-gray-500">{new Date(p.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <div className="text-gray-600 mt-1">
                Payment ID: {p.paymentId}
                {p.email && <> • {p.email}</>}
                {p.contact && <> • {p.contact}</>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
