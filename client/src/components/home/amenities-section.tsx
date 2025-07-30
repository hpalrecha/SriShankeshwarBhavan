import { Wifi, Car, Coffee, Shield, Utensils, Users, Clock, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import roomImage from "@assets/images (7)_1753275469754.jpg";

export default function AmenitiesSection() {
  const amenities = [
    {
      icon: Car,
      title: "Free Parking",
      description: "Secure parking space for all guests"
    },
    {
      icon: Shield,
      title: "Driver Freshen-Up Facility",
      description: "Dedicated facilities available for drivers to freshen up"
    },
    {
      icon: Shield,
      title: "24/7 Security",
      description: "Round-the-clock security for your peace of mind"
    },
    {
      icon: Utensils,
      title: "Satvik Bhojanshala",
      description: "Authentic Rajasthani swaad with pure vegetarian meals"
    },
    {
      icon: Users,
      title: "Group (Bulk) Booking",
      description: "Special arrangements for large groups and families"
    },
    {
      icon: Clock,
      title: "Flexible Check-in",
      description: "We allow you to stay for 24 hours - you can come at any time"
    },
    {
      icon: Clock,
      title: "24 Hours Stay Policy",
      description: "Full 24-hour accommodation from your check-in time"
    },
    {
      icon: Phone,
      title: "24/7 Support",
      description: "Call us at 9727070766 or 9727070765 for assistance"
    }
  ];

  return (
    <section id="amenities" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Amenities & Services</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enjoy a comfortable stay with our comprehensive range of amenities designed for your convenience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {amenities.map((amenity, index) => (
            <Card 
              key={index} 
              className={`hover:shadow-lg transition-shadow duration-300 ${
                amenity.title === "Group (Bulk) Booking" ? "cursor-pointer hover:bg-orange-50" : ""
              }`}
              onClick={amenity.title === "Group (Bulk) Booking" ? () => {
                const message = encodeURIComponent("We want to book rooms in bulk in your bhavan.");
                window.open(`https://wa.me/919902123456?text=${message}`, '_blank');
              } : undefined}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-brand-orange-bg rounded-lg flex items-center justify-center mx-auto mb-4">
                  <amenity.icon className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{amenity.title}</h3>
                <p className="text-sm text-gray-600">{amenity.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 bg-white rounded-xl p-8 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Us?</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-orange rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Nearest to Dherasar at 1 min walkable distance</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-orange rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Newly built 49 fully AC rooms with modern amenities</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-orange rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Dedicated parking and driver freshen up facility available</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-orange rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Satvik Bhojanshala with authentic Rajasthani swaad</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <img
                src={roomImage}
                alt="Comfortable hotel room interior"
                className="rounded-lg shadow-md w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}