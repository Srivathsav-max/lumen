"use client";

// Protected routes are now handled by middleware
import Sidebar from "@/components/dashboard/sidebar";
import Navbar from "@/components/dashboard/navbar";
import { useState, useEffect } from "react";
import { DashboardFeature, FeatureRouter } from "@/components/dashboard/feature-router";
import { usePathname } from "next/navigation";
import "@/styles/sketchy-elements.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentFeature, setCurrentFeature] = useState<DashboardFeature>("home");
  const pathname = usePathname();
  
  // Determine initial feature based on pathname
  useEffect(() => {
    const feature = pathname.split("/").pop() || "home";
    setCurrentFeature(feature as DashboardFeature);
  }, [pathname]);
  
  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f5f5f5] sketchy-shapes">
          <FeatureRouter feature={currentFeature}>
            {children}
          </FeatureRouter>
        </main>
      </div>
    </div>
  );
}
