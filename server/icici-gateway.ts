import crypto from "crypto";
import { PaymentGatewayInterface } from "./payment-gateways";

export interface ICICIConfig {
  merchantId: string;
  merchantSecretKey: string;
  baseUrl: string;
  isTestMode: boolean;
}

export interface ICICIPaymentData {
  merchantId: string;
  merchantTxnNo: string;
  amount: string;
  currencyCode: string;
  payType: string;
  customerEmailID: string;
  transactionType: string;
  txnDate: string;
  returnURL: string;
  secureHash: string;
  customerMobileNo: string;
  addlParam1?: string;
  addlParam2?: string;
}

export class ICICIGateway implements PaymentGatewayInterface {
  private config: ICICIConfig;

  constructor(config: ICICIConfig) {
    this.config = config;
    console.log("Initializing ICICI Gateway with config:", {
      merchantId: config.merchantId,
      baseUrl: this.config.baseUrl,
      isTestMode: config.isTestMode
    });
  }

  async createOrder(amount: number, currency: string, bookingId: string, customerData?: any) {
    try {
      console.log("Creating ICICI order:", { amount, currency, bookingId });

      const merchantTxnNo = `BOOK_${bookingId}_${Date.now()}`;
      const txnDate = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
      const returnURL = `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/icici/success`;

      const paymentData: ICICIPaymentData = {
        merchantId: this.config.merchantId,
        merchantTxnNo,
        amount: amount.toFixed(2),
        currencyCode: "356", // INR currency code
        payType: "0", // Capture payment details on PG payment page
        customerEmailID: customerData?.email || "guest@ssbb.in",
        transactionType: "SALE",
        txnDate,
        returnURL,
        secureHash: "", // Will be calculated below
        customerMobileNo: customerData?.mobile || "9999999999",
        addlParam1: `Booking_${bookingId}`,
        addlParam2: "Hotel_Room_Booking"
      };

      // Calculate secure hash
      paymentData.secureHash = this.calculateSecureHash(paymentData);

      console.log("ICICI payment data prepared:", {
        merchantTxnNo,
        amount: paymentData.amount,
        hash: paymentData.secureHash
      });

      const apiUrl = `${this.config.baseUrl}/pg/api/v2/initiateSale`;
      console.log("Making ICICI API request to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const responseText = await response.text();
      console.log("ICICI API response status:", response.status);
      console.log("ICICI API response text:", responseText.substring(0, 500));

      let result;
      try {
        result = JSON.parse(responseText);
        console.log("ICICI API parsed response:", result);
      } catch (parseError) {
        console.error("ICICI API returned non-JSON response:", responseText.substring(0, 200));
        return {
          success: false,
          error: "ICICI API returned invalid response format"
        };
      }

      if (result.responseCode === "R1000") {
        // Success response
        return {
          success: true,
          orderId: merchantTxnNo,
          redirectUrl: `${result.redirectURI}?tranCtx=${result.tranCtx}`,
          tranCtx: result.tranCtx,
          merchantTxnNo: merchantTxnNo,
          gatewayResponse: result
        };
      } else {
        console.error("ICICI order creation failed:", result);
        return {
          success: false,
          error: result.responseMessage || "Order creation failed",
          gatewayResponse: result
        };
      }

    } catch (error: any) {
      console.error("ICICI order creation error:", error);
      return {
        success: false,
        error: error.message || "Failed to create order"
      };
    }
  }

  async verifyPayment(paymentData: any): Promise<boolean> {
    try {
      console.log("Verifying ICICI payment:", paymentData);

      // For webhook verification, check the secure hash
      if (paymentData.secureHash) {
        const expectedHash = this.calculateResponseHash(paymentData);
        return expectedHash === paymentData.secureHash;
      }

      // For redirect verification, check transaction status
      if (paymentData.merchantTxnNo) {
        const statusResult = await this.getTransactionStatus(paymentData.merchantTxnNo);
        return statusResult.success && statusResult.status === 'SUCCESS';
      }

      return false;
    } catch (error) {
      console.error("ICICI payment verification error:", error);
      return false;
    }
  }

  async refundPayment(originalTxnNo: string, refundAmount: number) {
    try {
      console.log("Initiating ICICI refund:", { originalTxnNo, refundAmount });

      const merchantTxnNo = `REF_${originalTxnNo}_${Date.now()}`;
      const refundData = {
        merchantID: this.config.merchantId,
        merchantTxnNo,
        originalTxnNo,
        transactionType: "REFUND",
        amount: refundAmount.toFixed(2),
        aggregatorID: "J_03345", // From UAT kit
        secureHash: ""
      };

      // Calculate secure hash for refund
      refundData.secureHash = this.calculateRefundHash(refundData);

      const formData = new URLSearchParams();
      Object.entries(refundData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${this.config.baseUrl}/pg/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const result = await response.json();
      console.log("ICICI refund response:", result);

      return {
        success: result.responseCode === "R1000",
        refundId: merchantTxnNo,
        gatewayResponse: result
      };

    } catch (error: any) {
      console.error("ICICI refund error:", error);
      return {
        success: false,
        error: error.message || "Refund failed"
      };
    }
  }

  async getTransactionStatus(merchantTxnNo: string) {
    try {
      console.log("Getting ICICI transaction status:", merchantTxnNo);

      const statusData = {
        merchantID: this.config.merchantId,
        merchantTxnNo,
        originalTxnNo: merchantTxnNo,
        transactionType: "STATUS",
        aggregatorID: "J_03345",
        amount: "10.00", // Amount required for hash calculation
        secureHash: ""
      };

      // Calculate secure hash for status check
      statusData.secureHash = this.calculateStatusHash(statusData);

      const formData = new URLSearchParams();
      Object.entries(statusData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${this.config.baseUrl}/pg/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const result = await response.json();
      console.log("ICICI status response:", result);

      return {
        success: result.responseCode === "R1000",
        status: result.transactionStatus,
        gatewayResponse: result
      };

    } catch (error: any) {
      console.error("ICICI status check error:", error);
      return {
        success: false,
        error: error.message || "Status check failed"
      };
    }
  }

  private calculateSecureHash(data: ICICIPaymentData): string {
    // Hash calculation as per ICICI documentation using HMAC SHA-256
    // hashKey = addlParam1addlParam2amountcurrencyCodecustomerEmailIDcustomerMobileNomerchantIdmerchantTxnNopayTypereturnURLtransactionTypetxnDate
    const hashText = `${data.addlParam1 || ''}${data.addlParam2 || ''}${data.amount}${data.currencyCode}${data.customerEmailID}${data.customerMobileNo}${data.merchantId}${data.merchantTxnNo}${data.payType}${data.returnURL}${data.transactionType}${data.txnDate}`;
    
    console.log("ICICI hash text:", hashText);
    
    // Using HMAC SHA-256 with merchant secret key as per ICICI documentation
    const hash = crypto
      .createHmac('sha256', this.config.merchantSecretKey)
      .update(hashText)
      .digest('hex');
    
    console.log("ICICI calculated HMAC hash:", hash);
    return hash;
  }

  private calculateResponseHash(data: any): string {
    // Calculate hash for response verification
    // Implementation depends on ICICI's response hash algorithm
    const hashText = `${data.merchantId}${data.merchantTxnNo}${data.amount}${data.transactionStatus}`;
    return crypto
      .createHmac('sha256', this.config.merchantSecretKey)
      .update(hashText)
      .digest('hex');
  }

  private calculateStatusHash(data: any): string {
    // Calculate hash for status check
    const hashText = `${data.merchantID}${data.merchantTxnNo}${data.originalTxnNo}${data.transactionType}${data.aggregatorID}${data.amount}`;
    return crypto
      .createHmac('sha256', this.config.merchantSecretKey)
      .update(hashText)
      .digest('hex');
  }

  private calculateRefundHash(data: any): string {
    // Calculate hash for refund request
    const hashText = `${data.merchantID}${data.merchantTxnNo}${data.originalTxnNo}${data.transactionType}${data.aggregatorID}${data.amount}`;
    return crypto
      .createHmac('sha256', this.config.merchantSecretKey)
      .update(hashText)
      .digest('hex');
  }
}

// ICICI Gateway Factory
export function createICICIGateway(): ICICIGateway {
  let baseUrl = process.env.ICICI_BASE_URL || "https://qa.phicommerce.com";
  
  // Clean the base URL - remove any API path suffixes
  baseUrl = baseUrl.replace(/\/pg\/api.*$/, '');
  // Ensure no trailing slash
  baseUrl = baseUrl.replace(/\/$/, '');
  
  const config: ICICIConfig = {
    merchantId: process.env.ICICI_MERCHANT_ID || "T_03342",
    merchantSecretKey: process.env.ICICI_MERCHANT_SECRET || "abc",
    baseUrl: baseUrl,
    isTestMode: process.env.NODE_ENV !== "production"
  };

  console.log("Final ICICI config:", {
    merchantId: config.merchantId,
    baseUrl: config.baseUrl,
    fullApiUrl: `${config.baseUrl}/pg/api/v2/initiateSale`
  });

  return new ICICIGateway(config);
}