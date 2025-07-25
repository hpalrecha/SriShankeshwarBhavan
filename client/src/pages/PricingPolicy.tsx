import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import Footer from "@/components/Footer";

export default function PricingPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Pricing Policy</CardTitle>
          <p className="text-center text-muted-foreground">Sri Shankeshwar Bengaluru Bhavan</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Room Tariff Structure</h2>
            <div className="space-y-2">
              <p>• All room charges are considered as <strong>donations</strong> to Sri Shankeshwar Bengaluru Bhavan</p>
              <p>• Room categories and their respective donation amounts are displayed on our booking platform</p>
              <p>• Donation amounts are inclusive of basic amenities and facilities</p>
              <p>• Additional services like food may have separate donation charges</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Payment Terms</h2>
            <div className="space-y-2">
              <p>• Donations can be made online through secure payment gateways or at the time of check-in</p>
              <p>• Online payments are processed through Razorpay and other authorized payment partners</p>
              <p>• Payment gateway charges (if any) are as per the gateway provider's terms</p>
              <p>• All donations are subject to applicable taxes as per Indian law</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Booking Charges</h2>
            <div className="space-y-2">
              <p>• No additional booking or convenience fees are charged</p>
              <p>• The displayed donation amount is the final amount payable</p>
              <p>• Food donations (breakfast, lunch, dinner) are optional and priced separately</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Donation Receipt</h2>
            <div className="space-y-2">
              <p>• Digital receipts are sent via email upon successful payment</p>
              <p>• Physical receipts can be provided upon request at the reception</p>
              <p>• All donations are eligible for tax benefits under applicable sections of Income Tax Act</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Price Revisions</h2>
            <div className="space-y-2">
              <p>• Donation amounts may be revised periodically to maintain facility standards</p>
              <p>• Confirmed bookings will honor the donation amount at the time of booking</p>
              <p>• Price changes will be updated on the website and communicated in advance</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Contact Information</h2>
            <div className="space-y-2">
              <p><strong>Address:</strong> Sri Shankeshwar Bengaluru Bhavan, Shankheshwar, Patan District, Gujarat</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
              <p><strong>Email:</strong> info@ssbb.in</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> July 25, 2025<br/>
              This pricing policy is subject to change without prior notice. For the most current information, please refer to our website.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}