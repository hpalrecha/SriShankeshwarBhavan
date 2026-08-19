import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
          <p className="text-center text-muted-foreground">Sri Shankeshwar Bengaluru Bhavan</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <div className="space-y-2">
              <p><strong>Personal Information:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Name, email address, phone number</li>
                <li>• Government ID details for verification</li>
                <li>• Address and travel information</li>
                <li>• Payment information (processed securely)</li>
              </ul>
              <p><strong>Booking Information:</strong> Dates, room preferences, guest count, special requirements</p>
              <p><strong>Usage Data:</strong> Website interactions, IP address, browser type</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <div className="space-y-2">
              <p>• <strong>Booking Management:</strong> Process reservations and provide services</p>
              <p>• <strong>Communication:</strong> Send confirmations, reminders, and important updates</p>
              <p>• <strong>Payment Processing:</strong> Complete transactions securely</p>
              <p>• <strong>Service Improvement:</strong> Enhance user experience and facility services</p>
              <p>• <strong>Legal Compliance:</strong> Meet regulatory requirements and safety protocols</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
            <div className="space-y-2">
              <p><strong>We do NOT sell or rent personal information to third parties.</strong></p>
              <p><strong>Limited sharing only for:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Payment gateway processing (Razorpay, etc.)</li>
                <li>• Government authorities when legally required</li>
                <li>• Emergency services if guest safety is at risk</li>
                <li>• Service providers bound by confidentiality agreements</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <div className="space-y-2">
              <p>• <strong>Encryption:</strong> All sensitive data transmitted using SSL/TLS encryption</p>
              <p>• <strong>Secure Storage:</strong> Data stored on secure servers with restricted access</p>
              <p>• <strong>Payment Security:</strong> PCI DSS compliant payment processing</p>
              <p>• <strong>Access Control:</strong> Only authorized personnel can access personal information</p>
              <p>• <strong>Regular Updates:</strong> Security measures updated regularly</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies and Tracking</h2>
            <div className="space-y-2">
              <p><strong>Essential Cookies:</strong> Required for website functionality and booking process</p>
              <p><strong>Performance Cookies:</strong> Help improve website performance and user experience</p>
              <p><strong>No Third-party Tracking:</strong> We do not use advertising cookies or tracking pixels</p>
              <p><strong>Cookie Control:</strong> You can manage cookie preferences in your browser settings</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights (Under Indian IT Act)</h2>
            <div className="space-y-2">
              <p>• <strong>Access:</strong> Request copies of personal information we hold</p>
              <p>• <strong>Correction:</strong> Update or correct inaccurate personal information</p>
              <p>• <strong>Deletion:</strong> Request removal of personal data (subject to legal requirements)</p>
              <p>• <strong>Data Portability:</strong> Receive personal data in a structured format</p>
              <p>• <strong>Opt-out:</strong> Unsubscribe from marketing communications</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <div className="space-y-2">
              <p>• <strong>Booking Records:</strong> Retained for 7 years for legal and tax purposes</p>
              <p>• <strong>Payment Information:</strong> Deleted after transaction completion (gateway retains as per their policy)</p>
              <p>• <strong>Marketing Data:</strong> Retained until you opt-out or request deletion</p>
              <p>• <strong>Website Logs:</strong> Deleted after 12 months</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Communication Preferences</h2>
            <div className="space-y-2">
              <p>• <strong>Essential Communications:</strong> Booking confirmations, check-in details (cannot opt-out)</p>
              <p>• <strong>Marketing Communications:</strong> Promotional offers, newsletters (can opt-out)</p>
              <p>• <strong>WhatsApp:</strong> Optional service communications (can opt-out anytime)</p>
              <p>• <strong>SMS:</strong> Booking reminders and important updates</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
            <div className="space-y-2">
              <p>• Children under 18 must have parent/guardian consent for bookings</p>
              <p>• We do not knowingly collect personal information from children under 13</p>
              <p>• Parents can request access or deletion of their child's information</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Policy Updates</h2>
            <div className="space-y-2">
              <p>• Privacy policy may be updated to reflect legal changes or service improvements</p>
              <p>• Major changes will be communicated via email or website notice</p>
              <p>• Continued use of services constitutes acceptance of updated policy</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact for Privacy Matters</h2>
            <div className="space-y-2">
              <p><strong>Privacy Officer:</strong> Sri Shankeshwar Bengaluru Bhavan</p>
              <p><strong>Address:</strong> Shankheshwar, Patan District, Gujarat 384265</p>
              <p><strong>Email:</strong> privacy@ssbb.in</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Booking Cancellations and Refunds</h2>
            <div className="space-y-2">
              <p><strong>Emergency cancellations:</strong> Where a confirmed booking is cancelled on account of a genuine emergency — including medical emergency, bereavement, or other circumstances beyond the guest's reasonable control — the Trust shall review the request on a case-by-case basis and may refund the donation amount in full or in part. Supporting documentation may be required. Any dispute arising from such a refund decision shall be governed by Indian law and subject to the exclusive jurisdiction of the courts specified in these terms.</p>
              <p>Full cancellation and refund terms are set out in our Cancellation &amp; Refund Policy and Terms &amp; Conditions.</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> July 25, 2025<br/>
              <strong>Effective Date:</strong> July 25, 2030<br/>
              This privacy policy complies with the Information Technology Act, 2000 and Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}

