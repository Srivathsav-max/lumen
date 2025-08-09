"use client";

// Protected routes are now handled by middleware
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { DashboardFeature, FeatureRouter } from "@/components/dashboard/feature-router";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/ios-spinner";
import dynamic from "next/dynamic";

const AIChatMenu = dynamic(
  () => import("@/components/ai/ai-chat-menu").then((m) => m.AIChatMenu),
  { ssr: false, loading: () => null }
);

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

  // No search bar in the navbar per product spec
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Header (no divider) */}
        <header className="grid grid-cols-3 h-16 shrink-0 items-center px-4">
          <div className="flex items-center">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex justify-center">
            {/* Centered AI chat input on Notes and Brainstorm pages */}
            {(pathname?.startsWith("/dashboard/notes") || pathname?.startsWith("/dashboard/brainstorm")) && <AIChatMenu />}
          </div>
          <div className="flex items-center justify-end gap-2">
            {/* Right-side actions reserved */}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <FeatureRouter feature={currentFeature}>
            {children}
          </FeatureRouter>
        </div>
      </main>
    </SidebarProvider>
  );
}
