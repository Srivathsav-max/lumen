"use client";

import { useAuth } from "@/hooks/use-auth";
import { Bell, Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  return (
    <div className="bg-white border-b border-gray-200 py-3 px-4 md:px-6">
      <div className="flex items-center justify-between">
        {/* Left side - Search */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </form>
        </div>

        {/* Right side - User info and actions */}
        <div className="flex items-center ml-4 space-x-2">
          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-50">
            <Bell className="h-5 w-5 text-gray-600" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
              3
            </Badge>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-50">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full">
              5
            </Badge>
          </Button>

          {/* User profile */}
          <Button variant="ghost" asChild className="flex items-center space-x-2 hover:bg-gray-50">
            <Link href="/dashboard/profile">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-100 text-gray-900 text-xs font-medium">
                  {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}{(user?.last_name?.charAt(0) || user?.username?.charAt(1) || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm text-gray-900 font-medium">
                {user?.first_name || user?.username || 'User'}
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
