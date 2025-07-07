import { useState } from "react";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import DashboardStats from "@/components/admin/dashboard-stats";
import BookingsTable from "@/components/admin/bookings-table";
import CheckinCheckout from "@/components/admin/checkin-checkout";

export default function Admin() {
  const [currentTab, setCurrentTab] = useState("admin");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Tabs currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats />
        <BookingsTable />
        <CheckinCheckout />
      </div>
    </div>
  );
}
