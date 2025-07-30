import { MapPin, Clock, Plane, Train } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import templeImage from "@assets/17412441144_1753275501511.jpg";

export default function LocationSection() {
  const landmarks = [
    {
      name: "Shankheshwar Parshwanath Temple",
      distance: "",
      time: "1 min walk"
    },
    {
      name: "Patan Railway Station",
      distance: "58 km", 
      time: "1.5 hours"
    },
    {
      name: "Ahmedabad Airport",
      distance: "132 km",
      time: "3 hours travel time"
    },
    {
      name: "Mehsana Bus Stand",
      distance: "70 km",
      time: "2 hours travel time"
    },
    {
      name: "Local Market Area",
      distance: "",
      time: "1 min walk"
    }
  ];

  return (
    <section id="location" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sacred Location</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Located in Shankheshwar, Gujarat - steps away from the revered Parshwanath Temple with convenient access to major transport hubs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Map/Image */}
          <div className="relative">
            <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center mb-4">
              <img
                src={templeImage}
                alt="Shankheshwar temple and surrounding area in Gujarat"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-brand-orange" />
                <div>
                  <p className="font-semibold text-sm">Sri Shankeshwar Bengaluru Bhavan</p>
                  <p className="text-xs text-gray-600">Shankheshwar, Gujarat</p>
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
                      {landmark.distance && <p className="text-sm font-semibold text-gray-900">{landmark.distance}</p>}
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
                  <li>• Railway connectivity via Patan station with connecting buses</li>
                  <li>• Airport transfers from Ahmedabad can be arranged upon request</li>
                  <li>• Local taxi and auto-rickshaw services available</li>
                  <li>• Free parking available for guests with vehicles</li>
                </ul>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-brand-orange-bg border-brand-orange">
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Our Address</h4>
                <p className="text-gray-700 leading-relaxed">
                  Sri Shankeshwar Bengaluru Bhavan Trust<br />
                  Near Shankeshwar Parshwanath Temple<br />
                  Shankheshwar, Patan District<br />
                  Gujarat 384246, India
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}