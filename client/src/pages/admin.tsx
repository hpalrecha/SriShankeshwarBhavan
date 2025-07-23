import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardStats from "@/components/admin/dashboard-stats";
import BookingsTable from "@/components/admin/bookings-table";
import CheckinCheckout from "@/components/admin/checkin-checkout";
import InventoryManagement from "@/components/admin/inventory-management";
import AdminBookingForm from "@/components/admin/admin-booking-form";
import UsersTable from "@/components/admin/users-table";
import TrusteeManagement from "@/components/admin/trustee-management";
import FoodSettings from "@/components/admin/food-settings";
import WhatsAppSettings from "./admin/WhatsAppSettings";
import TrusteeReservations from "./admin/TrusteeReservations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Package, 
  BookOpen, 
  PlusCircle, 
  CheckCircle, 
  Utensils, 
  MessageSquare, 
  Users, 
  Crown,
  Calendar,
  LogOut,
  Hotel,
  Menu
} from "lucide-react";

interface UserWithBookings {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  isTrustee: boolean;
  totalBookings?: number;
  lastBooking?: string;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUserForBooking, setSelectedUserForBooking] = useState<UserWithBookings | null>(null);
  const [userBookingsFilter, setUserBookingsFilter] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("admin_logged_in");
    if (!isAdminLoggedIn) {
      toast({
        title: "Access Denied",
        description: "Please login to access the admin dashboard.",
        variant: "destructive",
      });
      setLocation("/admin/login");
    }
  }, [setLocation, toast]);

  const isAdminLoggedIn = localStorage.getItem("admin_logged_in");
  
  if (!isAdminLoggedIn) {
    return null; // Will redirect in useEffect
  }

  const handleViewUserBookings = (userId: number) => {
    setUserBookingsFilter(userId);
    setActiveTab("bookings");
  };

  const handleCreateBookingForUser = (user: UserWithBookings) => {
    setSelectedUserForBooking(user);
    setActiveTab("create-booking");
  };

  const handleViewBookingDetails = (bookingId: number) => {
    if (bookingId === -1) {
      // View all bookings
      setUserBookingsFilter(null);
      setActiveTab("bookings");
    } else {
      // For individual booking details, we could implement a modal or navigate to bookings
      // For now, let's navigate to bookings tab
      setUserBookingsFilter(null);
      setActiveTab("bookings");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardStats onViewBookingDetails={handleViewBookingDetails} />;
      case "inventory":
        return <InventoryManagement />;
      case "bookings":
        return <BookingsTable userFilter={userBookingsFilter} />;
      case "create-booking":
        return <AdminBookingForm preselectedUser={selectedUserForBooking} />;
      case "checkin":
        return <CheckinCheckout />;
      case "food-settings":
        return <FoodSettings />;
      case "users":
        return (
          <UsersTable 
            onViewBookings={handleViewUserBookings}
            onCreateBooking={handleCreateBookingForUser}
          />
        );
      case "trustees":
        return <TrusteeManagement />;
      case "trustee-reservations":
        return <TrusteeReservations />;
      case "whatsapp-settings":
        return <WhatsAppSettings />;
      default:
        return <DashboardStats onViewBookingDetails={handleViewBookingDetails} />;
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Room Inventory", icon: Package },
    { id: "bookings", label: "Bookings", icon: BookOpen },
    { id: "create-booking", label: "New Booking", icon: PlusCircle },
    { id: "checkin", label: "Check-in/out", icon: CheckCircle },
    { id: "food-settings", label: "Food Settings", icon: Utensils },
    { id: "whatsapp-settings", label: "WhatsApp", icon: MessageSquare },
    { id: "users", label: "Users", icon: Users },
    { id: "trustees", label: "Trustees", icon: Crown },
    { id: "trustee-reservations", label: "Trustee Reservations", icon: Calendar },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close mobile sidebar when tab is selected
  };

  const SidebarContent = () => (
    <>
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Hotel className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">SSBB Admin</h1>
            <p className="text-sm text-gray-500">Hotel Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-orange-500 text-white"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => {
            localStorage.removeItem("admin_logged_in");
            setLocation("/");
            toast({
              title: "Logged Out",
              description: "You have been successfully logged out.",
            });
          }}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white shadow-lg flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="h-full bg-white flex flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              {/* Mobile Menu Button */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div className="min-w-0">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {sidebarItems.find(item => item.id === activeTab)?.label || "Dashboard"}
                </h2>
                <p className="text-sm lg:text-base text-gray-600 mt-1 hidden sm:block">
                  {activeTab === "dashboard" && "Overview of hotel operations and statistics"}
                  {activeTab === "inventory" && "Manage room categories and availability"}
                  {activeTab === "bookings" && "View and manage all bookings"}
                  {activeTab === "create-booking" && "Create new booking for guests"}
                  {activeTab === "checkin" && "Handle guest check-in and check-out"}
                  {activeTab === "food-settings" && "Configure meal pricing and options"}
                  {activeTab === "whatsapp-settings" && "WhatsApp notification configuration"}
                  {activeTab === "users" && "Manage guest accounts and information"}
                  {activeTab === "trustees" && "Manage trustee accounts and privileges"}
                  {activeTab === "trustee-reservations" && "Configure trustee-only reservation dates"}
                </p>
              </div>
            </div>
            <div className="text-xs lg:text-sm text-gray-500 hidden md:block">
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6 min-w-0">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
