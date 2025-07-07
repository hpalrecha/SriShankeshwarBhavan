import { CalendarIcon, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Header() {
  const [, setLocation] = useLocation();

  const handleAdminLogin = () => {
    setLocation("/admin/login");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setLocation("/")}>
              <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">SSH</span>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900 hidden sm:block">Sri Shankeshwar Bengaluru Bhavan</h1>
              <h1 className="ml-3 text-lg font-semibold text-gray-900 sm:hidden">SSH Bhavan</h1>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="/" className="text-gray-900 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
              <a href="#amenities" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Amenities</a>
              <a href="#location" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Location</a>
              <a href="#contact" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="tel:+918022345678"
              className="hidden sm:flex items-center text-gray-500 hover:text-brand-orange p-2 rounded-md transition-colors"
            >
              <Phone className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Call Now</span>
            </a>
            <Button 
              onClick={handleAdminLogin}
              className="bg-brand-orange text-white hover:bg-brand-orange-light"
            >
              Admin Login
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
