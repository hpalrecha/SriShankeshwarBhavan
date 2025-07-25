import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShippingPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Shipping Policy</CardTitle>
          <p className="text-center text-muted-foreground">Sri Shankeshwar Bengaluru Bhavan</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Service Nature</h2>
            <div className="space-y-2">
              <p>Sri Shankeshwar Bengaluru Bhavan provides <strong>accommodation services</strong> and does not involve physical shipping of goods.</p>
              <p>Our services are location-based and delivered at our premises in Shankheshwar, Gujarat.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Digital Delivery</h2>
            <div className="space-y-2">
              <p><strong>Booking Confirmations:</strong> Sent instantly via email upon successful payment</p>
              <p><strong>Digital Receipts:</strong> Delivered to registered email address within 24 hours</p>
              <p><strong>Check-in Instructions:</strong> Provided via email and SMS before arrival date</p>
              <p><strong>Booking Modifications:</strong> Updates sent via email immediately</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Physical Items (If Applicable)</h2>
            <div className="space-y-2">
              <p>• <strong>Room Keys:</strong> Provided at reception during check-in</p>
              <p>• <strong>Physical Receipts:</strong> Available at reception upon request</p>
              <p>• <strong>Prasadam/Religious Items:</strong> Distributed during temple visits (no shipping)</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Communication Delivery</h2>
            <div className="space-y-2">
              <p><strong>Email Notifications:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Booking confirmation: Immediate</li>
                <li>• Pre-arrival reminders: 1 day before check-in</li>
                <li>• Check-in day welcome: Morning of arrival</li>
                <li>• Post-checkout feedback: Day after departure</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. WhatsApp Notifications</h2>
            <div className="space-y-2">
              <p>• Booking confirmations sent via WhatsApp (if opted-in)</p>
              <p>• Important updates and reminders</p>
              <p>• Emergency communications during stay</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Delivery Failures</h2>
            <div className="space-y-2">
              <p><strong>Email Delivery Issues:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Check spam/junk folders</li>
                <li>• Verify email address accuracy</li>
                <li>• Contact us for manual resending</li>
              </ul>
              <p><strong>SMS/WhatsApp Issues:</strong> Ensure correct mobile number with country code (+91)</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Customer Support</h2>
            <div className="space-y-2">
              <p>For any delivery-related issues with booking confirmations or digital receipts:</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
              <p><strong>Email:</strong> info@ssbb.in</p>
              <p><strong>Address:</strong> Sri Shankeshwar Bengaluru Bhavan, Shankheshwar, Patan District, Gujarat</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> July 25, 2025<br/>
              This shipping policy applies to digital communications and service delivery only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}