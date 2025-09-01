# Payment Gateway Webhook URLs Documentation

## Overview
This document provides all webhook URLs and configuration details for payment gateway integrations in the hotel booking system.

## Webhook Endpoints

### 1. ICICI Bank Direct Integration Webhook
**URL**: `https://your-domain.replit.app/api/payment/icici/webhook`
**Method**: POST
**Content-Type**: application/json

#### Configuration with ICICI Bank:
1. Contact ICICI Bank payment integration team
2. Provide webhook URL: `https://your-domain.replit.app/api/payment/icici/webhook`
3. Request merchant credentials and API documentation
4. Configure success/failure redirect URLs:
   - Success: `https://your-domain.replit.app/api/payment/icici/success`
   - Failure: `https://your-domain.replit.app/api/payment/icici/failure`

#### Environment Variables Required:
```env
ICICI_MERCHANT_KEY=your_merchant_key_from_icici
ICICI_MERCHANT_ID=your_merchant_id
ICICI_API_SECRET=your_api_secret_key
```

#### Events Handled:
- **SUCCESS/COMPLETED/CAPTURED** - Payment successfully processed
- **FAILED/DECLINED/CANCELLED** - Payment failed or was cancelled
- **PENDING/PROCESSING** - Payment is being processed

### 2. ICICI Bank Response URLs
**Success URL**: `https://your-domain.replit.app/api/payment/icici/success`
**Failure URL**: `https://your-domain.replit.app/api/payment/icici/failure`
**Method**: POST
**Content-Type**: application/x-www-form-urlencoded

### 3. Razorpay Webhook (Alternative)
**URL**: `https://your-domain.replit.app/api/payment/razorpay/webhook`
**Method**: POST
**Content-Type**: application/json

#### Configuration in Razorpay Dashboard:
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Add New Webhook"
3. URL: `https://your-domain.replit.app/api/payment/razorpay/webhook`
4. Secret: Generate a secret key and add to environment variables
5. Events to subscribe:
   - `payment.captured`
   - `payment.authorized` 
   - `payment.failed`

#### Environment Variable Required:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_from_razorpay_dashboard
```

#### Events Handled:
- **payment.captured** - Payment successfully captured
- **payment.authorized** - Payment authorized (auto-capture)
- **payment.failed** - Payment failed/declined

### 2. PayU Success Callback
**URL**: `https://your-domain.replit.app/api/payment/payu/success`
**Method**: POST
**Content-Type**: application/x-www-form-urlencoded

#### Configuration in PayU Dashboard:
1. Go to PayU Dashboard → Settings → Response URL
2. Success URL: `https://your-domain.replit.app/api/payment/payu/success`
3. Failure URL: `https://your-domain.replit.app/api/payment/payu/failure`

### 3. PayU Failure Callback
**URL**: `https://your-domain.replit.app/api/payment/payu/failure`
**Method**: POST
**Content-Type**: application/x-www-form-urlencoded

## Deployment URLs

### Development Environment:
```
ICICI Webhook: http://localhost:5000/api/payment/icici/webhook
ICICI Success: http://localhost:5000/api/payment/icici/success
ICICI Failure: http://localhost:5000/api/payment/icici/failure
Razorpay Webhook: http://localhost:5000/api/payment/razorpay/webhook
PayU Success: http://localhost:5000/api/payment/payu/success
PayU Failure: http://localhost:5000/api/payment/payu/failure
```

### Production Environment (Replit):
```
ICICI Webhook: https://your-project-name.replit.app/api/payment/icici/webhook
ICICI Success: https://your-project-name.replit.app/api/payment/icici/success
ICICI Failure: https://your-project-name.replit.app/api/payment/icici/failure
Razorpay Webhook: https://your-project-name.replit.app/api/payment/razorpay/webhook
PayU Success: https://your-project-name.replit.app/api/payment/payu/success
PayU Failure: https://your-project-name.replit.app/api/payment/payu/failure
```

### Custom Domain (if configured):
```
ICICI Webhook: https://your-custom-domain.com/api/payment/icici/webhook
ICICI Success: https://your-custom-domain.com/api/payment/icici/success
ICICI Failure: https://your-custom-domain.com/api/payment/icici/failure
Razorpay Webhook: https://your-custom-domain.com/api/payment/razorpay/webhook
PayU Success: https://your-custom-domain.com/api/payment/payu/success
PayU Failure: https://your-custom-domain.com/api/payment/payu/failure
```

## Security Features

### Razorpay Webhook Security:
- **Signature Verification**: Uses HMAC-SHA256 with webhook secret
- **Header Validation**: Checks `x-razorpay-signature` header
- **Raw Body Processing**: Uses `express.raw()` middleware for signature verification

### PayU Callback Security:
- **Hash Verification**: Validates SHA512 hash from PayU
- **Parameter Validation**: Verifies all payment parameters
- **Status Checking**: Confirms success/failure status

## Webhook Processing Flow

### Razorpay Webhook Flow:
1. **Receive webhook** with signature verification
2. **Parse event data** and extract payment information
3. **Update payment transaction** status in database
4. **Update booking** payment status to 'paid_online'
5. **Send confirmation** notifications (email/WhatsApp)
6. **Return success** response to Razorpay

### PayU Callback Flow:
1. **Receive callback** data from PayU
2. **Verify payment hash** using merchant credentials
3. **Extract booking ID** from transaction ID
4. **Update payment records** in database
5. **Redirect user** to success/failure page with status

## Testing Webhooks

### Test Razorpay Webhook:
```bash
# Test webhook endpoint with sample data
curl -X POST https://your-domain.replit.app/api/payment/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "status": "captured",
          "amount": 50000,
          "currency": "INR"
        }
      }
    }
  }'
```

### Test PayU Callback:
```bash
# Test success callback
curl -X POST https://your-domain.replit.app/api/payment/payu/success \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "txnid=TXN_TEST123_1234567&status=success&amount=500&mihpayid=12345"
```

## Environment Configuration

### Required Environment Variables:
```env
# ICICI Bank Configuration (Primary)
ICICI_MERCHANT_KEY=your_merchant_key_from_icici
ICICI_MERCHANT_ID=your_merchant_id
ICICI_API_SECRET=your_api_secret_key

# Razorpay Configuration (Alternative)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# PayU Configuration (Alternative)
PAYU_MERCHANT_KEY=your_payu_merchant_key
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_MERCHANT_SALT=your_payu_salt

# Base URLs
BASE_URL=https://your-domain.replit.app
CLIENT_URL=https://your-domain.replit.app
```

## Database Tables Used

### Payment Transactions Table:
```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  gateway_name VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  gateway_response JSONB,
  failure_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Room Bookings Table (Payment Status):
```sql
ALTER TABLE room_bookings 
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid',
ADD COLUMN payment_reference VARCHAR(255);
```

## Troubleshooting

### Common Issues:

1. **Webhook Not Receiving Data**:
   - Check URL configuration in payment gateway dashboard
   - Verify HTTPS is used for production
   - Check firewall/security settings

2. **Signature Verification Failed**:
   - Ensure webhook secret is correctly configured
   - Check raw body processing middleware
   - Verify HMAC calculation

3. **Booking Update Failed**:
   - Check booking ID extraction logic
   - Verify database connection
   - Check transaction ID format

### Debug Commands:
```bash
# Check webhook logs
tail -f /var/log/webhook.log

# Test database connection
SELECT * FROM payment_transactions WHERE status = 'pending' LIMIT 5;

# Verify payment gateway configuration
SELECT * FROM payment_gateways WHERE is_active = true;
```

## Production Checklist

### Before Going Live:
- [ ] Configure webhook URLs in payment gateway dashboards
- [ ] Set up webhook secrets in environment variables
- [ ] Test webhook endpoints with sample data
- [ ] Verify HTTPS certificate is valid
- [ ] Set up monitoring and alerting for failed webhooks
- [ ] Configure backup webhook handlers if needed
- [ ] Test payment flow end-to-end
- [ ] Set up logging for webhook events

### Monitoring:
- Monitor webhook response times
- Track failed webhook deliveries
- Set up alerts for payment failures
- Log all webhook events for audit

This documentation provides all necessary information to configure and maintain payment gateway webhooks for the hotel booking system.