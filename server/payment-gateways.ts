import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentGateway, PaymentTransaction } from "@shared/schema";

// Payment Gateway Interface
export interface PaymentGatewayInterface {
  createOrder(amount: number, currency: string, bookingId: string): Promise<any>;
  verifyPayment(paymentData: any): Promise<boolean>;
  refundPayment(transactionId: string, amount: number): Promise<any>;
}

// Razorpay Implementation
export class RazorpayGateway implements PaymentGatewayInterface {
  private razorpay: Razorpay;
  private config: PaymentGateway;

  constructor(config: PaymentGateway) {
    this.config = config;
    
    console.log("Initializing Razorpay with config:", {
      key_id: config.publicKey,
      isTestMode: config.isTestMode,
      gatewayName: config.gatewayName
    });
    
    this.razorpay = new Razorpay({
      key_id: config.publicKey!,
      key_secret: config.secretKey!,
    });
  }

  async createOrder(amount: number, currency: string, bookingId: string) {
    console.log("Creating Razorpay order:", { amount, currency, bookingId });
    console.log("Using credentials:", { key_id: this.config.publicKey, isTestMode: this.config.isTestMode });
    
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: currency.toUpperCase(),
      receipt: `booking_${bookingId}`,
      payment_capture: 1,
    };

    return await this.razorpay.orders.create(options);
  }

  async verifyPayment(paymentData: any): Promise<boolean> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", this.config.secretKey!)
      .update(sign.toString())
      .digest("hex");

    return expectedSign === razorpay_signature;
  }

  async refundPayment(transactionId: string, amount: number) {
    return await this.razorpay.payments.refund(transactionId, {
      amount: Math.round(amount * 100),
    });
  }
}

// PayU Implementation
export class PayUGateway implements PaymentGatewayInterface {
  private config: PaymentGateway;

  constructor(config: PaymentGateway) {
    this.config = config;
  }

  async createOrder(amount: number, currency: string, bookingId: string) {
    const txnid = `TXN_${bookingId}_${Date.now()}`;
    const productinfo = `Room Booking - ${bookingId}`;
    const firstname = "Guest";
    const email = "guest@ssbb.in";
    const phone = "9999999999";

    // Create PayU hash
    const hashString = `${this.config.merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${this.config.merchantId}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    return {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      hash,
      key: this.config.publicKey,
      service_provider: "payu_paisa",
      surl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/payu/success`,
      furl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/payu/failure`,
    };
  }

  async verifyPayment(paymentData: any): Promise<boolean> {
    const { status, txnid, amount, productinfo, firstname, email, mihpayid } = paymentData;
    
    if (status !== "success") return false;

    const hashString = `${this.config.merchantId}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.config.merchantKey}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    return hash === paymentData.hash;
  }

  async refundPayment(transactionId: string, amount: number) {
    // PayU refund implementation would go here
    // This typically requires calling PayU's refund API
    throw new Error("PayU refund not implemented yet");
  }
}

// Payment Gateway Factory
export class PaymentGatewayFactory {
  static createGateway(config: PaymentGateway): PaymentGatewayInterface {
    switch (config.gatewayName) {
      case "razorpay":
        return new RazorpayGateway(config);
      case "payu":
        return new PayUGateway(config);
      default:
        throw new Error(`Unsupported payment gateway: ${config.gatewayName}`);
    }
  }
}

// Payment Service
export class PaymentService {
  static async processPayment(
    gateway: PaymentGatewayInterface,
    amount: number,
    currency: string,
    bookingId: string
  ) {
    try {
      const order = await gateway.createOrder(amount, currency, bookingId);
      return { success: true, data: order };
    } catch (error: any) {
      console.error("Payment processing error:", error);
      return { success: false, error: error?.message || "Payment processing failed" };
    }
  }

  static async verifyPayment(gateway: PaymentGatewayInterface, paymentData: any) {
    try {
      const isValid = await gateway.verifyPayment(paymentData);
      return { success: true, isValid };
    } catch (error: any) {
      console.error("Payment verification error:", error);
      return { success: false, error: error?.message || "Payment verification failed" };
    }
  }
}