// TRUSTEE MANAGEMENT COMPONENT - REMOVED PER USER REQUEST
// This entire component was used for managing trustee auto-booking functionality
// which has been removed at user's request

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

// Placeholder component for trustees page
export default function TrusteeManagement() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trustee Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Trustee Auto-Booking Removed</h2>
            <p className="text-gray-600 mt-2">
              The trustee auto-booking functionality has been removed as requested.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Trustees can still make regular bookings through the normal booking process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}