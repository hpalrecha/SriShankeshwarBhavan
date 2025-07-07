import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import DashboardStats from "@/components/admin/dashboard-stats";
import BookingsTable from "@/components/admin/bookings-table";
import CheckinCheckout from "@/components/admin/checkin-checkout";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [currentTab, setCurrentTab] = useState("admin");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Tabs currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage bookings, guests, and hotel operations</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("admin_logged_in");
              setLocation("/");
              toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
              });
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
        
        <DashboardStats />
        <BookingsTable />
        <CheckinCheckout />
      </div>
    </div>
  );
}
