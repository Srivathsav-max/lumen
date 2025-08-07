"use client";

// Protected routes are now handled by middleware
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { DashboardFeature, FeatureRouter } from "@/components/dashboard/feature-router";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/ios-spinner";
import { Search, Bell, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentFeature, setCurrentFeature] = useState<DashboardFeature>("home");
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };
  
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
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-8 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </form>

            {/* Notifications */}
            <div className="relative">
              <button className="relative h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground flex items-center justify-center">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  3
                </span>
              </button>
            </div>

            {/* Messages */}
            <div className="relative">
              <button className="relative h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  5
                </span>
              </button>
            </div>
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
