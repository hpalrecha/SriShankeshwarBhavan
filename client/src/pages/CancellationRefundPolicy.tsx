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
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">No Cancellation / No Refund / No Room Change</h3>
              <p className="text-red-700 mt-1">
                There is no cancellation, room change, or refund policy on advance room bookings at
                Shri Shankeshwar Bengaluru Bhavan. The Bhavan is not a commercial venture — it is run
                purely for the Seva of Yatris, and bookings are accepted on this basis.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. A Dharmik Alternative</h2>
            <div className="space-y-2">
              <p>
                While no refund is offered, guests who wish to cancel their booking may, with their
                consent, have their balance amount transferred towards <strong>Sadhu-Sadhvi
                Gochari-Paani Seva</strong>, which is carried out round the year at Shri Shankheshwar
                Tirth.
              </p>
              <p>
                The amount will be utilized for the Seva of our revered Sadhus &amp; Sadhvis — a Punya
                Karya and the best possible use of your contribution.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How to Request a Cancellation</h2>
            <div className="space-y-2">
              <p><strong>Online:</strong> Use the "View My Bookings" section with your email and booking ID</p>
              <p><strong>Phone:</strong> Call +91 9426343558 during office hours (9 AM - 6 PM)</p>
              <p><strong>Email:</strong> Send a request to info@ssbb.in with your booking details</p>
              <p><strong>Required Information:</strong> Booking ID, registered name, email address, reason for cancellation</p>
              <p>On cancellation, your balance will be routed to Sadhu-Sadhvi Gochari-Paani Seva as described above, unless you choose otherwise with the Trust's agreement.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Payment Gateway Failures</h2>
            <div className="space-y-2">
              <p><strong>Failed Transactions:</strong> Automatic refund within 7-10 business days</p>
              <p><strong>Double Charges:</strong> Extra amount refunded within 3-5 business days</p>
              <p><strong>Processing Errors:</strong> Full refund without deduction</p>
              <p><strong>Bank Statement:</strong> Check statement before reporting failed transactions</p>
              <p className="text-sm text-muted-foreground">This section covers genuine payment or technical errors on our side, not a guest's own decision to cancel.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Force Majeure Events</h2>
            <div className="space-y-2">
              <p>In case of circumstances beyond our control:</p>
              <ul className="ml-4 space-y-1">
                <li>• Government lockdowns or travel restrictions</li>
                <li>• Natural disasters affecting the region</li>
                <li>• Temple closure for religious/maintenance reasons</li>
                <li>• Utility failures affecting accommodation</li>
              </ul>
              <p><strong>Policy:</strong> The Trust will review such cases individually; a credit note valid for 12 months may be offered at its discretion.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Contact for Cancellations</h2>
            <div className="space-y-2">
              <p><strong>Customer Service Hours:</strong> 9:00 AM - 6:00 PM (IST)</p>
              <p><strong>Phone:</strong> +91 9426343558</p>
              <p><strong>Email:</strong> cancellations@ssbb.in</p>
              <p><strong>WhatsApp:</strong> +91 9426343558 (text only)</p>
              <p><strong>Address:</strong> Sri Shankeshwar Bengaluru Bhavan, Shankheshwar, Patan District, Gujarat</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> October 10, 2026<br/>
              <strong>Effective Date:</strong> October 10, 2026<br/>
              By Narendra Jain, Trustee and President, Bangalore Bhavan, Shankheshwar.<br/>
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
