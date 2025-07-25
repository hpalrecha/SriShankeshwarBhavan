import { CalendarIcon, Phone, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { handleSmoothNavigation } from "@/lib/scroll-utils";
import { useState } from "react";

export default function Header() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging you out.",
        variant: "destructive",
      });
    },
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setLocation("/")}>
              <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">SSBB</span>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900 hidden sm:block">Sri Shankeshwar Bengaluru Bhavan</h1>
              <h1 className="ml-3 text-lg font-semibold text-gray-900 sm:hidden">SSBB</h1>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a 
                href="/" 
                className="text-gray-900 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation("/");
                }}
              >
                Home
              </a>
              <a 
                href="#amenities" 
                className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={(e) => handleSmoothNavigation("#amenities", e)}
              >
                Amenities
              </a>
              <a 
                href="#location" 
                className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={(e) => handleSmoothNavigation("#location", e)}
              >
                Location
              </a>
              <a 
                href="#contact" 
                className="text-gray-500 hover:text-brand-orange px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={(e) => handleSmoothNavigation("#contact", e)}
              >
                Contact
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => handleSmoothNavigation("#booking")}
              className="hidden sm:inline-flex bg-brand-orange text-white hover:bg-orange-600"
              size="sm"
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Book Now
            </Button>

            <a 
              href="tel:+918022345678"
              className="hidden sm:flex items-center text-gray-500 hover:text-brand-orange p-2 rounded-md transition-colors"
            >
              <Phone className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Call Now</span>
            </a>

            {user && typeof user === 'object' && 'name' in user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700 hidden sm:inline">
                  Welcome, {user?.name || 'Guest'}
                </span>
                <Button 
                  onClick={() => setLocation("/dashboard")}
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Dashboard
                </Button>
                <Button 
                  onClick={() => logoutMutation.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "..." : "Logout"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setLocation("/login")}
                  variant="outline"
                  size="sm"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => setLocation("/signup")}
                  size="sm"
                  className="bg-brand-orange text-white hover:bg-orange-600"
                >
                  Sign Up
                </Button>

              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:text-brand-orange"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              <a 
                href="/" 
                className="text-gray-900 hover:text-brand-orange block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation("/");
                  setMobileMenuOpen(false);
                }}
              >
                Home
              </a>
              <a 
                href="#booking" 
                className="text-gray-500 hover:text-brand-orange block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={(e) => {
                  handleSmoothNavigation("#booking", e);
                  setMobileMenuOpen(false);
                }}
              >
                Book Now
              </a>
              <a 
                href="#amenities" 
                className="text-gray-500 hover:text-brand-orange block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={(e) => {
                  handleSmoothNavigation("#amenities", e);
                  setMobileMenuOpen(false);
                }}
              >
                Amenities
              </a>
              <a 
                href="#location" 
                className="text-gray-500 hover:text-brand-orange block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={(e) => {
                  handleSmoothNavigation("#location", e);
                  setMobileMenuOpen(false);
                }}
              >
                Location
              </a>
              <a 
                href="#contact" 
                className="text-gray-500 hover:text-brand-orange block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={(e) => {
                  handleSmoothNavigation("#contact", e);
                  setMobileMenuOpen(false);
                }}
              >
                Contact
              </a>
              
              {user && typeof user === 'object' && 'name' in user ? (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="px-3 py-2">
                    <p className="text-sm text-gray-700">Welcome, {user?.name || 'Guest'}</p>
                  </div>
                  <Button 
                    onClick={() => {
                      setLocation("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="mx-3 mb-2 w-auto"
                    size="sm"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    onClick={() => {
                      logoutMutation.mutate();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="mx-3 w-auto"
                    size="sm"
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "..." : "Logout"}
                  </Button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                  <Button 
                    onClick={() => {
                      setLocation("/login");
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="mx-3 w-auto"
                    size="sm"
                  >
                    Login
                  </Button>
                  <Button 
                    onClick={() => {
                      setLocation("/signup");
                      setMobileMenuOpen(false);
                    }}
                    className="bg-brand-orange text-white hover:bg-orange-600 mx-3 w-auto"
                    size="sm"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
