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
  UserPlus,
  PenTool,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { DashboardFeature } from "./feature-router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  onNavigate?: (feature: DashboardFeature) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
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

  // Core navigation items for all users
  const coreNavItems = [
    { 
      name: "Notes", 
      feature: "notes" as DashboardFeature, 
      href: "/dashboard/notes", 
      icon: <PenTool className="w-5 h-5" /> 
    }
  ];

  // Admin/Developer navigation items
  const adminNavItems = [
    { 
      name: "Settings", 
      feature: "settings" as DashboardFeature, 
      href: "/dashboard/settings", 
      icon: <Settings className="w-5 h-5" /> 
    },
    { 
      name: "Waitlist", 
      feature: "waitlist" as DashboardFeature, 
      href: "/dashboard/waitlist", 
      icon: <UserPlus className="w-5 h-5" /> 
    },

  ];

  // Combine navigation items based on user role
  const navItems = isAdminOrDeveloper ? [...baseNavItems, ...coreNavItems, ...adminNavItems] : [...baseNavItems, ...coreNavItems];

  const NavItem = ({ item, collapsed = false }: { item: typeof navItems[0], collapsed?: boolean }) => {
    const isActive = pathname === item.href;
    
    const handleClick = (e: React.MouseEvent) => {
      // Close mobile menu
      setIsMobileMenuOpen(false);
    };
    
    return (
      <Link
        href={item.href}
        className={`flex items-center ${collapsed ? 'justify-center px-1 py-2 mx-1' : 'px-3 py-2.5 mx-2'} my-1 rounded-lg transition-all duration-200 group cursor-pointer ${
          isActive 
            ? "bg-gray-100 text-gray-900 border border-gray-200" 
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
        onClick={handleClick}
        title={collapsed ? item.name : undefined}
      >
        <div className={`${collapsed ? '' : 'mr-3'} ${isActive ? "text-gray-900" : "text-gray-500"}`}>
          {item.icon}
        </div>
        {!collapsed && (
          <span className="text-sm font-medium">
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button 
        onClick={toggleMobileMenu}
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 bg-white text-gray-900 border-gray-200 shadow-sm md:hidden"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar for desktop */}
      <div className={`hidden md:flex flex-col ${isCollapsed ? 'w-12' : 'w-30'} bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300`}>
        {/* Header with toggle */}
        <div className={`${isCollapsed ? 'p-2' : 'p-6'} border-b border-gray-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-2">
                <PenTool className="h-6 w-6 text-gray-900" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Lumen</h2>
                  <p className="text-xs text-gray-500">Learning Platform</p>
                </div>
              </div>
              <Button
                onClick={toggleSidebar}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1 h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-1' : 'p-4'}`}>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.name} item={item} collapsed={isCollapsed} />
            ))}
          </nav>
        </div>
        
        <div className={`${isCollapsed ? 'p-1' : 'p-4'} border-t border-gray-200`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-100 text-gray-900 text-sm font-medium">
                    {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}{(user?.last_name?.charAt(0) || user?.username?.charAt(1) || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {(user?.first_name && user?.last_name) ? `${user.first_name} ${user.last_name}` : (user?.username || 'User')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                  {isAdminOrDeveloper && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {user?.is_admin ? 'Admin' : 'Developer'}
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span className="text-sm">Logout</span>
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-100 text-gray-900 text-xs font-medium">
                  {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 h-8 w-8"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <PenTool className="h-6 w-6 text-gray-900" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Lumen</h2>
                  <p className="text-xs text-gray-500">Learning Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-100 text-gray-900 text-sm font-medium">
                    {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}{(user?.last_name?.charAt(0) || user?.username?.charAt(1) || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {(user?.first_name && user?.last_name) ? `${user.first_name} ${user.last_name}` : (user?.username || 'User')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
