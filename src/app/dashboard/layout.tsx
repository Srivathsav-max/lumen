"use client";

// Protected routes are now handled by middleware
import Sidebar from "@/components/dashboard/sidebar";
import Navbar from "@/components/dashboard/navbar";
import { useState, useEffect } from "react";
import { DashboardFeature, FeatureRouter } from "@/components/dashboard/feature-router";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import "@/styles/sketchy-elements.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentFeature, setCurrentFeature] = useState<DashboardFeature>("home");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Debug logging
  console.log('Dashboard layout - Auth state:', { 
    isAuthenticated, 
    isLoading, 
    user: user?.username,
    pathname 
  });
  
  // Determine initial feature based on pathname
  useEffect(() => {
    const feature = pathname.split("/").pop() || "home";
    setCurrentFeature(feature as DashboardFeature);
  }, [pathname]);
  
  // Redirect to login if not authenticated (after loading is complete)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333]"></div>
      </div>
    );
  }
  
  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
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
