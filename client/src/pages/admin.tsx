import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import DashboardStats from "@/components/admin/dashboard-stats";
import BookingsTable from "@/components/admin/bookings-table";
import CheckinCheckout from "@/components/admin/checkin-checkout";
import InventoryManagement from "@/components/admin/inventory-management";
import AdminBookingForm from "@/components/admin/admin-booking-form";
import UsersTable from "@/components/admin/users-table";
import TrusteeManagement from "@/components/admin/trustee-management";
import FoodSettings from "@/components/admin/food-settings";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardStats />;
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
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage bookings, guests, and hotel operations</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("admin_logged_in");
              setLocation("/");
              toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
              });
            }}
          >
            Logout
          </Button>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex space-x-6">
              {[
                { id: "dashboard", label: "Dashboard" },
                { id: "inventory", label: "Room Inventory" },
                { id: "bookings", label: "Bookings" },
                { id: "create-booking", label: "New Booking" },
                { id: "checkin", label: "Check-in/out" },
                { id: "food-settings", label: "Food Settings" },
                { id: "users", label: "Users" },
                { id: "trustees", label: "Trustees" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? "bg-brand-orange text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}
