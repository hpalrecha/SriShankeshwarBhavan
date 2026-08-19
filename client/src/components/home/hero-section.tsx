import { Calendar, MapPin, Users } from "lucide-react";
import { smoothScrollToSection } from "@/lib/scroll-utils";
import ssbbLogo from "@assets/SSBB_1753878285568.png";
import exteriorImage from "@assets/gallery-exterior.jpg";
import receptionImage from "@assets/gallery-reception.png";
import lobbyImage from "@assets/gallery-lobby.jpg";

export default function HeroSection() {
  return (
    <section className="relative">
      {/* Light Orange Background */}
      <div className="absolute inset-0 bg-orange-50"></div>

      {/* Content */}
      <div className="relative z-10 pt-10 pb-28 text-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.4fr)] gap-5 items-center">

          {/* Right - two photos stacked */}
          <div className="order-3 grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="h-40 lg:h-[172px] overflow-hidden rounded-xl shadow-md">
              <img
                src={receptionImage}
                alt="Reception desk at Sri Shankeshwar Bengaluru Bhavan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-40 lg:h-[172px] overflow-hidden rounded-xl shadow-md">
              <img
                src={lobbyImage}
                alt="Guest lounge and Labharthi Pariwar donor wall"
                className="w-full h-full object-cover object-[center_85%]"
              />
            </div>
          </div>

          {/* Centre - logo and titles */}
          <div className="order-1 lg:order-2 text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-5">
              <img
                src={ssbbLogo}
                alt="SSBB Logo"
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-lg"
              />
            </div>
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold mb-4">
              Sri Shankeshwar
              <span className="block text-brand-orange">Bengaluru Bhavan</span>
            </h1>
            <p className="text-base md:text-lg mb-6 text-gray-600 max-w-xl mx-auto">
              Experience spiritual comfort and modern hospitality in the sacred town of Shankheshwar, Gujarat
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <span>Sacred Location</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-brand-orange" />
                <span>Guest Comfort</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-orange" />
                <span>Easy Booking</span>
              </div>
            </div>
          </div>

          {/* Left - building */}
          <div className="order-2 lg:order-1 w-full h-64 lg:h-[360px] overflow-hidden rounded-xl shadow-md">
            <img
              src={exteriorImage}
              alt="Exterior of Sri Shankeshwar Bengaluru Bhavan"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 mt-8">
          <p>Scroll down to check availability and book your stay</p>
          <button
            onClick={() => smoothScrollToSection("booking")}
            className="mt-3 animate-bounce focus:outline-none hover:scale-110 transition-transform duration-200"
            aria-label="Scroll to booking section"
          >
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}






