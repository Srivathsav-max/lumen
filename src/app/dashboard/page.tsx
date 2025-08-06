"use client";

import { useAuth } from "@/hooks/use-auth";
import { memo } from "react";

const DashboardPage = memo(function DashboardPage() {
  const { user } = useAuth();
  
  // Debug logging
  console.log('Dashboard page rendered for user:', user?.username);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">
          Hi, {user?.first_name || user?.username || 'User'}! 👋
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to your dashboard
        </p>
      </div>
    </div>
  );
});

export default DashboardPage;
