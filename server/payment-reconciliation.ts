import { storage } from "./storage";

export interface UnmatchedPayment {
  paymentId: string;
  orderId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  receipt: string | null;
  email: string | null;
  contact: string | null;
}

export interface ReconciliationResult {
  checkedFrom: string;
  checkedTo: string;
  totalCaptured: number;
  unmatchedCount: number;
  unmatched: UnmatchedPayment[];
}

// The internal defense against a captured-but-unrecorded payment (booking
// created before charging, the webhook secret coming from the DB, DB-write
// failures no longer being swallowed) all depend on specific code paths
// working correctly. This is the independent backstop: it asks Razorpay
// itself what it actually captured and checks that against our own
// payment_transactions table, so a gap can never go unnoticed again even if
// caused by some future, unrelated bug.
export async function findUnmatchedRazorpayPayments(
  days: number = 14
): Promise<ReconciliationResult> {
  const gateway = await storage.getPaymentGatewayByName("razorpay");
  if (!gateway || !gateway.publicKey || !gateway.secretKey) {
    throw new Error("Razorpay gateway is not configured");
  }

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const auth = Buffer.from(`${gateway.publicKey}:${gateway.secretKey}`).toString("base64");

  const items: any[] = [];
  let skip = 0;
  const count = 100;
  // Razorpay caps a single page at 100; page through until we've seen
  // everything in range, with a hard ceiling so a runaway account can't
  // turn this into an unbounded loop.
  while (items.length < 2000) {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments?from=${from}&to=${to}&count=${count}&skip=${skip}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay API error (${response.status}): ${text}`);
    }
    const data = await response.json();
    const pageItems = data.items || [];
    items.push(...pageItems);
    if (pageItems.length < count) break;
    skip += count;
  }

  const captured = items.filter((p: any) => p.status === "captured");

  const unmatched: UnmatchedPayment[] = [];
  for (const payment of captured) {
    const transaction = payment.order_id
      ? await storage.getPaymentTransactionByOrderId(payment.order_id)
      : undefined;
    const isMatched = transaction && ["completed", "success"].includes(transaction.status);
    if (!isMatched) {
      unmatched.push({
        paymentId: payment.id,
        orderId: payment.order_id || null,
        amount: payment.amount / 100,
        currency: payment.currency,
        createdAt: new Date(payment.created_at * 1000).toISOString(),
        receipt: payment.notes?.receipt || null,
        email: payment.email || null,
        contact: payment.contact || null,
      });
    }
  }

  return {
    checkedFrom: new Date(from * 1000).toISOString(),
    checkedTo: new Date(to * 1000).toISOString(),
    totalCaptured: captured.length,
    unmatchedCount: unmatched.length,
    unmatched,
  };
}
