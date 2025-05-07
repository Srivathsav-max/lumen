"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import Sidebar from "@/components/dashboard/sidebar";
import Navbar from "@/components/dashboard/navbar";
import "@/styles/sketchy-elements.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar />
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f5f5f5] sketchy-shapes">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
