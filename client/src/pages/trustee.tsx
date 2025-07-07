import { useState } from "react";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import TrusteeForm from "@/components/trustee/trustee-form";
import TrusteeTable from "@/components/trustee/trustee-table";

export default function Trustee() {
  const [currentTab, setCurrentTab] = useState("trustee");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Tabs currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Trustee Management</h2>
          <p className="mt-2 text-gray-600">Manage trustee auto-bookings and privileges</p>
        </div>

        <TrusteeForm />
        <TrusteeTable />
      </div>
    </div>
  );
}
