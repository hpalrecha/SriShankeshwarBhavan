import { MapPin, Clock, Plane, Train } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LocationSection() {
  const landmarks = [
    {
      name: "Bengaluru Palace",
      distance: "5.2 km",
      time: "15 min drive"
    },
    {
      name: "Lalbagh Botanical Garden",
      distance: "3.8 km", 
      time: "12 min drive"
    },
    {
      name: "Commercial Street",
      distance: "2.1 km",
      time: "8 min drive"
    },
    {
      name: "MG Road Metro Station",
      distance: "1.5 km",
      time: "5 min walk"
    },
    {
      name: "Kempegowda International Airport",
      distance: "38 km",
      time: "45 min drive"
    },
    {
      name: "Bengaluru City Railway Station",
      distance: "6.2 km",
      time: "20 min drive"
    }
  ];

  return (
    <section id="location" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Prime Location</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Strategically located in the heart of Bengaluru with easy access to major attractions and transport hubs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Map/Image */}
          <div className="relative">
            <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center mb-4">
              <img
                src="https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                alt="Bengaluru city view with modern buildings"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-brand-orange" />
                <div>
                  <p className="font-semibold text-sm">Sri Shankeshwar Bengaluru Bhavan</p>
                  <p className="text-xs text-gray-600">Central Bengaluru</p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Nearby Attractions & Transport</h3>
              <div className="grid grid-cols-1 gap-3">
                {landmarks.map((landmark, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {landmark.name.includes('Airport') ? (
                        <Plane className="w-4 h-4 text-brand-orange" />
                      ) : landmark.name.includes('Railway') || landmark.name.includes('Metro') ? (
                        <Train className="w-4 h-4 text-brand-orange" />
                      ) : (
                        <MapPin className="w-4 h-4 text-brand-orange" />
                      )}
                      <span className="font-medium text-gray-900">{landmark.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{landmark.distance}</p>
                      <p className="text-xs text-gray-600">{landmark.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transportation Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="w-5 h-5 text-brand-orange" />
                  <h4 className="font-semibold text-gray-900">Transportation Tips</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Metro connectivity available via MG Road Station (Purple & Blue Lines)</li>
                  <li>• Airport shuttle service can be arranged upon request</li>
                  <li>• Taxi and auto-rickshaw services readily available</li>
                  <li>• Free parking available for guests with vehicles</li>
                </ul>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-brand-orange-bg border-brand-orange">
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Our Address</h4>
                <p className="text-gray-700 leading-relaxed">
                  Sri Shankeshwar Bengaluru Bhavan<br />
                  Central Business District<br />
                  Bengaluru, Karnataka 560001<br />
                  India
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}