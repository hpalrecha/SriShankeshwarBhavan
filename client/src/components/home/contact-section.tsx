import { Phone, Mail, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ContactSection() {
  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      details: ["+91 9727070765", "+91 9727070766"],
      subtext: "24/7 Booking & Support"
    },
    {
      icon: Mail,
      title: "Email", 
      details: ["booking@ssbb.in"],
      subtext: "Quick response within 2 hours"
    },
    {
      icon: Clock,
      title: "Reception Hours",
      details: ["24/7 front desk", "Check-in: 12:00 PM", "Check-out: 11:00 AM"],
      subtext: "Always available to assist"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      details: ["+91 9727070765"],
      subtext: "Instant booking assistance",
      action: () => window.open('https://wa.me/919727070765', '_blank')
    }
  ];

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get in touch with us for bookings, inquiries, or any assistance you need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {contactInfo.map((contact, index) => (
            <Card 
              key={index} 
              className={`text-center hover:shadow-lg transition-shadow duration-300 ${contact.action ? 'cursor-pointer' : ''}`}
              onClick={contact.action}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-brand-orange-bg rounded-lg flex items-center justify-center mx-auto mb-4">
                  <contact.icon className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">{contact.title}</h3>
                <div className="space-y-1 mb-2">
                  {contact.details.map((detail, idx) => (
                    <p key={idx} className="text-gray-700 font-medium">{detail}</p>
                  ))}
                </div>
                <p className="text-sm text-gray-500">{contact.subtext}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Contact & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-brand-orange text-white">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-4">Emergency Contact</h3>
              <p className="mb-4">For urgent matters or late-night assistance:</p>
              <div className="space-y-2">
                <p className="text-lg font-semibold">+91 9727070765</p>
                <p className="text-lg font-semibold">+91 9727070766</p>
                <p className="text-sm opacity-90">Available 24/7 for emergencies</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open('https://wa.me/919727070765', '_blank')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat on WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = 'tel:+919727070765'}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = 'mailto:booking@ssbb.in'}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operating Hours */}
        <div className="mt-12 bg-white rounded-xl p-8 shadow-lg text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Our Commitment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-16 h-16 bg-brand-orange-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-brand-orange" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">24/7 Service</h4>
              <p className="text-gray-600">Round-the-clock assistance for all your needs</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-brand-orange-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-brand-orange" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Quick Response</h4>
              <p className="text-gray-600">We respond to all inquiries within 2 hours</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-brand-orange-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-brand-orange" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Multilingual Support</h4>
              <p className="text-gray-600">English, Hindi, Gujarati, and more languages</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}