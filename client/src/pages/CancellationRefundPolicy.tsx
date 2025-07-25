import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import Footer from "@/components/Footer";

export default function CancellationRefundPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Cancellation & Refund Policy</CardTitle>
          <p className="text-center text-muted-foreground">Sri Shankeshwar Bengaluru Bhavan</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Cancellation Policy</h2>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800">More than 24 hours before check-in</h3>
                <p className="text-green-700">Full refund minus payment gateway processing charges (2-3%)</p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800">Less than 24 hours before check-in</h3>
                <p className="text-yellow-700">50% refund of the total donation amount</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800">No-show (without cancellation)</h3>
                <p className="text-red-700">No refund applicable</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How to Cancel</h2>
            <div className="space-y-2">
              <p><strong>Online:</strong> Use "View My Bookings" section with your email and booking ID</p>
              <p><strong>Phone:</strong> Call +91 9426343558 during office hours (9 AM - 6 PM)</p>
              <p><strong>Email:</strong> Send cancellation request to info@ssbb.in with booking details</p>
              <p><strong>Required Information:</strong> Booking ID, registered name, email address, reason for cancellation</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Refund Processing</h2>
            <div className="space-y-2">
              <p><strong>Processing Time:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Credit/Debit Cards: 5-7 business days</li>
                <li>• Net Banking: 3-5 business days</li>
                <li>• UPI/Digital Wallets: 1-3 business days</li>
                <li>• Bank transfers may take additional 2-3 days</li>
              </ul>
              <p><strong>Refund Method:</strong> Original payment method only</p>
              <p><strong>Currency:</strong> INR (Indian Rupees) only</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Emergency Cancellations</h2>
            <div className="space-y-2">
              <p>Special consideration for cancellations due to:</p>
              <ul className="ml-4 space-y-1">
                <li>• Medical emergencies (hospital certificate required)</li>
                <li>• Natural disasters or government restrictions</li>
                <li>• Family bereavement (death certificate required)</li>
                <li>• Flight/train cancellations (proof required)</li>
              </ul>
              <p><strong>Documentation:</strong> Valid proof must be submitted within 48 hours</p>
              <p><strong>Refund:</strong> Up to 80% refund may be considered on case-by-case basis</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Payment Gateway Failures</h2>
            <div className="space-y-2">
              <p><strong>Failed Transactions:</strong> Automatic refund within 7-10 business days</p>
              <p><strong>Double Charges:</strong> Extra amount refunded within 3-5 business days</p>
              <p><strong>Processing Errors:</strong> Full refund without deduction</p>
              <p><strong>Bank Statement:</strong> Check statement before reporting failed transactions</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Group Booking Cancellations</h2>
            <div className="space-y-2">
              <p><strong>Partial Cancellation:</strong> Refund calculated per room basis</p>
              <p><strong>Complete Group Cancellation:</strong> Standard cancellation policy applies</p>
              <p><strong>Trustee Reservations:</strong> Special cancellation terms may apply</p>
              <p><strong>Bulk Bookings (5+ rooms):</strong> Negotiable cancellation terms</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Modification vs Cancellation</h2>
            <div className="space-y-2">
              <p><strong>Date Changes:</strong> Subject to availability, no extra charges if within same rate period</p>
              <p><strong>Room Upgrades:</strong> Pay difference, no refund for downgrades</p>
              <p><strong>Guest Count Reduction:</strong> Refund difference if room type changed</p>
              <p><strong>Food Service Changes:</strong> Can be modified up to 6 hours before check-in</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Force Majeure Events</h2>
            <div className="space-y-2">
              <p>In case of circumstances beyond our control:</p>
              <ul className="ml-4 space-y-1">
                <li>• Government lockdowns or travel restrictions</li>
                <li>• Natural disasters affecting the region</li>
                <li>• Temple closure for religious/maintenance reasons</li>
                <li>• Utility failures affecting accommodation</li>
              </ul>
              <p><strong>Policy:</strong> Full refund or credit note valid for 12 months</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Refund Disputes</h2>
            <div className="space-y-2">
              <p><strong>Escalation Process:</strong></p>
              <ol className="ml-4 space-y-1">
                <li>1. Contact customer service within 7 days</li>
                <li>2. Provide all relevant documentation</li>
                <li>3. Management review within 3 business days</li>
                <li>4. Final decision communicated via email</li>
              </ol>
              <p><strong>Appeal:</strong> Written appeal with additional evidence within 15 days</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact for Cancellations</h2>
            <div className="space-y-2">
              <p><strong>Customer Service Hours:</strong> 9:00 AM - 6:00 PM (IST)</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
              <p><strong>Email:</strong> cancellations@ssbb.in</p>
              <p><strong>WhatsApp:</strong> +91 9426343558 (text only)</p>
              <p><strong>Address:</strong> Sri Shankeshwar Bengaluru Bhavan, Shankheshwar, Patan District, Gujarat</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Legal and Compliance</h2>
            <div className="space-y-2">
              <p>• This policy complies with Consumer Protection Act, 2019</p>
              <p>• All refunds subject to applicable tax deductions</p>
              <p>• Donation receipts adjusted for refunded amounts</p>
              <p>• RBI guidelines followed for payment reversals</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> July 25, 2025<br/>
              <strong>Effective Date:</strong> July 25, 2025<br/>
              This cancellation and refund policy is designed to be fair to both guests and the institution. 
              For specific cases not covered here, management reserves the right to make decisions in the best interest of all parties.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}