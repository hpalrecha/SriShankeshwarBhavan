import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Institution Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Sri Shankeshwar Bengaluru Bhavan</h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <p className="text-sm">
                  Shankheshwar, Patan District<br />
                  Gujarat 384265, India
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <p className="text-sm">+91 9426343558</p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <p className="text-sm">info@ssbb.in</p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li><span className="text-sm">Room Accommodation</span></li>
              <li><span className="text-sm">Food Services</span></li>
              <li><span className="text-sm">Temple Darshan</span></li>
              <li><span className="text-sm">Religious Activities</span></li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Legal & Policies</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/terms-and-conditions" className="text-sm hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy-policy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cancellation-refund-policy" className="text-sm hover:text-white transition-colors">Cancellation & Refund</Link></li>
              <li><Link href="/pricing-policy" className="text-sm hover:text-white transition-colors">Pricing Policy</Link></li>
              <li><Link href="/shipping-policy" className="text-sm hover:text-white transition-colors">Shipping Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              <p>&copy; 2025 Sri Shankeshwar Bengaluru Bhavan. All rights reserved.</p>
            </div>
            <div className="text-sm text-gray-400">
              <p>Secure payments powered by Razorpay</p>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>
              This website complies with Indian IT Act 2000, Consumer Protection Act 2019, 
              and RBI guidelines for digital payments. All donations are eligible for tax benefits under applicable sections.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}