"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { 
  Home, 
  User, 
  Settings, 
  BookOpen, 
  BarChart2, 
  Calendar, 
  LogOut,
  Menu,
  X,
  Bell,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import { DashboardFeature } from "./feature-router";
import Link from "next/link";

interface SidebarProps {
  onNavigate?: (feature: DashboardFeature) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Check if user is admin or developer
  const isAdminOrDeveloper = user?.is_admin || user?.roles?.includes('admin') || user?.roles?.includes('developer');

  // Base navigation items (shown to all users)
  const baseNavItems = [
    { 
      name: "Dashboard", 
      feature: "home" as DashboardFeature, 
      href: "/dashboard", 
      icon: <Home className="w-5 h-5" /> 
    },
    { 
      name: "Profile", 
      feature: "profile" as DashboardFeature, 
      href: "/dashboard/profile", 
      icon: <User className="w-5 h-5" /> 
    }
  ];

  // Admin/Developer navigation items
  const adminNavItems = [
    { 
      name: "Waitlist", 
      feature: "waitlist" as DashboardFeature, 
      href: "/dashboard/waitlist", 
      icon: <UserPlus className="w-5 h-5" /> 
    },
    { 
      name: "Analytics", 
      feature: "analytics" as DashboardFeature, 
      href: "/dashboard/analytics", 
      icon: <BarChart2 className="w-5 h-5" /> 
    },
    { 
      name: "Calendar", 
      feature: "calendar" as DashboardFeature, 
      href: "/dashboard/calendar", 
      icon: <Calendar className="w-5 h-5" /> 
    },
    { 
      name: "Courses", 
      feature: "courses" as DashboardFeature, 
      href: "/dashboard/courses", 
      icon: <BookOpen className="w-5 h-5" /> 
    },
    { 
      name: "Settings", 
      feature: "settings" as DashboardFeature, 
      href: "/dashboard/settings", 
      icon: <Settings className="w-5 h-5" /> 
    },
    { 
      name: "Notifications", 
      feature: "notifications" as DashboardFeature, 
      href: "/dashboard/notifications", 
      icon: <Bell className="w-5 h-5" /> 
    }
  ];

  // Combine navigation items based on user role
  const navItems = isAdminOrDeveloper ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname === item.href;
    
    const handleClick = (e: React.MouseEvent) => {
      // Close mobile menu
      setIsMobileMenuOpen(false);
    };
    
    return (
      <Link
        href={item.href}
        className={`flex items-center px-4 py-3 my-1 rounded-md transition-all duration-200 group cursor-pointer ${
          isActive 
            ? "bg-white text-[#333] border-2 border-[#333] shadow-[0_4px_0_0_#333]" 
            : "text-gray-300 hover:bg-white/10"
        }`}
        onClick={handleClick}
      >
        <div className={`mr-3 ${isActive ? "text-[#333]" : "text-gray-300"}`}>
          {item.icon}
        </div>
        <span className="font-mono text-lg">
          {item.name}
          {isActive && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          )}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-[#333] text-white md:hidden"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar for desktop */}
      <div className="hidden md:flex flex-col w-64 bg-[#111] border-r-2 border-[#333] h-screen sticky top-0 shadow-[4px_0_0_0_#333]">
        <div className="p-4 border-b-2 border-[#333]">
          <h2 className="text-2xl font-bold font-mono text-white">Lumen</h2>
          <p className="text-gray-400 font-mono text-sm">Learning Platform</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t-2 border-[#333]">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-[#333] shadow-[0_2px_0_0_#333] flex items-center justify-center overflow-hidden">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="font-mono text-white text-sm font-medium">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="font-mono text-gray-400 text-xs">
                {user?.email}
              </p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-white/10 rounded-md transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-mono text-lg">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-[#111] border-r-2 border-[#333] shadow-[4px_0_0_0_#333] overflow-y-auto">
            <div className="p-4 border-b-2 border-[#333]">
              <h2 className="text-2xl font-bold font-mono text-white">Lumen</h2>
              <p className="text-gray-400 font-mono text-sm">Learning Platform</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
            
            <div className="p-4 border-t-2 border-[#333]">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-[#333] shadow-[0_2px_0_0_#333] flex items-center justify-center overflow-hidden">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-mono text-white text-sm font-medium">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="font-mono text-gray-400 text-xs">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-white/10 rounded-md transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-mono text-lg">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
