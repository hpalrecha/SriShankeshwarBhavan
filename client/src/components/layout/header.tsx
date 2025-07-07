import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">SSH</span>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">Sri Shankeshwar Bengaluru Bhavan</h1>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="/" className="text-gray-900 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
              <a href="/rooms" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Rooms</a>
              <a href="/about" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
              <a href="/contact" className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-brand-orange p-2 rounded-md">
              <CalendarIcon className="w-6 h-6" />
            </button>
            <Button className="bg-brand-orange text-white hover:bg-brand-orange-light">
              Admin Login
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
