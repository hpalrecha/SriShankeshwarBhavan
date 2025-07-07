import { Calendar, MapPin, Users } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Sri Shankeshwar Bengaluru Bhavan - Beautiful hotel exterior with gardens"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-center text-white px-4">
        <div className="max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-brand-orange rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">SSH</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Sri Shankeshwar
              <span className="block text-brand-orange">Bengaluru Bhavan</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
            Experience spiritual comfort and modern hospitality in the heart of Bengaluru
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm md:text-base">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-brand-orange" />
              <span>Prime Location</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-brand-orange" />
              <span>Guest Comfort</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-brand-orange" />
              <span>Easy Booking</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-lg text-gray-200">
            <p>Scroll down to check availability and book your stay</p>
            <div className="mt-4 animate-bounce">
              <svg
                className="w-6 h-6 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}