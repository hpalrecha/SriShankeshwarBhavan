import Razorpay from "razorpay";

// Test with known working credentials
const razorpay = new Razorpay({
  key_id: "rzp_test_WjZrJoH8LFvqAK",
  key_secret: "QJIFNeT6S5z4a7T9vdnqiOGh",
});

async function testOrder() {
  try {
    console.log("Testing Razorpay order creation...");
    
    const order = await razorpay.orders.create({
      amount: 10000, // 100 INR in paise
      currency: "INR",
      receipt: "test_receipt_123",
      payment_capture: 1,
    });
    
    console.log("✅ SUCCESS: Order created successfully!");
    console.log("Order ID:", order.id);
    console.log("Order Details:", JSON.stringify(order, null, 2));
    
  } catch (error) {
    console.log("❌ FAILED: Order creation failed!");
    console.log("Error details:", error);
    console.log("Status Code:", error.statusCode);
    console.log("Error Code:", error.error?.code);
    console.log("Description:", error.error?.description);
  }
}

testOrder();