import { Calendar, MapPin, Users } from "lucide-react";
import { smoothScrollToSection } from "@/lib/scroll-utils";
import ssbbLogo from "@assets/SSBB_1753878285568.png";

export default function HeroSection() {
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Light Orange Background */}
      <div className="absolute inset-0 bg-orange-50"></div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-center text-gray-800 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img 
                src={ssbbLogo} 
                alt="SSBB Logo"
                className="w-20 h-20 rounded-xl object-cover shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Sri Shankeshwar
              <span className="block text-brand-orange">Bengaluru Bhavan</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-2xl mx-auto">
            Experience spiritual comfort and modern hospitality in the sacred town of Shankheshwar, Gujarat
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm md:text-base">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-brand-orange" />
              <span>Sacred Location</span>
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
          <div className="text-lg text-gray-600">
            <p>Scroll down to check availability and book your stay</p>
            <button 
              onClick={() => smoothScrollToSection("booking")}
              className="mt-4 animate-bounce focus:outline-none hover:scale-110 transition-transform duration-200"
              aria-label="Scroll to booking section"
            >
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
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}