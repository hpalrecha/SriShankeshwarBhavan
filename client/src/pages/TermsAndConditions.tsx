import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import Footer from "@/components/Footer";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Terms and Conditions</CardTitle>
          <p className="text-center text-muted-foreground">Sri Shankeshwar Bengaluru Bhavan</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. General Terms</h2>
            <div className="space-y-2">
              <p>By using our booking platform and services, you agree to comply with these terms and conditions.</p>
              <p>Sri Shankeshwar Bengaluru Bhavan reserves the right to modify these terms at any time without prior notice.</p>
              <p>These terms are governed by the laws of India and subject to Gujarat jurisdiction.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Booking and Reservations</h2>
            <div className="space-y-2">
              <p>• All bookings are subject to room availability</p>
              <p>• Confirmation is provided only after successful payment or advance booking</p>
              <p>• Check-in time: 12:00 PM, Check-out time: 11:00 AM</p>
              <p>• Early check-in or late check-out subject to availability and additional charges</p>
              <p>• Maximum occupancy per room must be adhered to as specified</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Payment Terms</h2>
            <div className="space-y-2">
              <p>• All payments are considered donations to the religious institution</p>
              <p>• Online payments are processed through secure, RBI-approved payment gateways</p>
              <p>• Payment must be completed at the time of booking or check-in</p>
              <p>• Failed transactions will be refunded within 7-10 working days</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cancellation Policy</h2>
            <div className="space-y-2">
              <p><strong>More than 24 hours before check-in:</strong> Full refund minus processing fee</p>
              <p><strong>Less than 24 hours:</strong> 50% refund of the donation amount</p>
              <p><strong>No-show:</strong> No refund applicable</p>
              <p><strong>Emergency cancellations:</strong> Where a confirmed booking is cancelled on account of a genuine emergency — including medical emergency, bereavement, or other circumstances beyond the guest's reasonable control — the Trust shall review the request on a case-by-case basis and may refund the donation amount in full or in part. Supporting documentation may be required. Any dispute arising from such a refund decision shall be governed by Indian law and subject to the exclusive jurisdiction of the courts specified in these terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Guest Responsibilities</h2>
            <div className="space-y-2">
              <p>• Valid government-issued photo ID required for check-in</p>
              <p>• Maintain cleanliness and respect religious premises</p>
              <p>• Follow dress code and behavioral guidelines within temple premises</p>
              <p>• No smoking, alcohol, or non-vegetarian food allowed</p>
              <p>• Comply with noise restrictions, especially during prayer times</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Facility Usage</h2>
            <div className="space-y-2">
              <p>• Common areas are for shared use with mutual respect</p>
              <p>• Temple timings must be observed for darshan and prayers</p>
              <p>• Parking subject to availability</p>
              <p>• Lost or damaged property will be charged as per actual cost</p>
              <p>• 24 hours running hot water is available in every room</p>
              <p>• RO purified water is available for drinking</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <div className="space-y-2">
              <p>• Sri Shankeshwar Bengaluru Bhavan is not liable for loss of personal belongings</p>
              <p>• Force majeure events beyond our control may affect services</p>
              <p>• Medical emergencies: Guests responsible for their own healthcare</p>
              <p>• Natural disasters or government restrictions may impact operations</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Privacy and Data Protection</h2>
            <div className="space-y-2">
              <p>• Personal information collected only for booking and service purposes</p>
              <p>• Data protection as per Indian IT Act and privacy laws</p>
              <p>• Contact details may be used for service communications</p>
              <p>• Third-party data sharing limited to payment processing only</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disputes and Resolution</h2>
            <div className="space-y-2">
              <p>• Any disputes will be resolved through mutual discussion</p>
              <p>• Legal jurisdiction: Patan District Courts, Gujarat</p>
              <p>• Applicable law: Indian legal framework</p>
              <p>• Mediation preferred before legal proceedings</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
            <div className="space-y-2">
              <p><strong>Address:</strong> Sri Shankeshwar Bengaluru Bhavan</p>
              <p>Shankheshwar, Patan District, Gujarat 384265</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
              <p><strong>Email:</strong> info@ssbb.in</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> July 25, 2025<br/>
              <strong>Effective Date:</strong> July 25, 2030<br/>
              By using our services, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}

