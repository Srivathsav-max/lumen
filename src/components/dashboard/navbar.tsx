"use client";

import { useAuth } from "@/providers/auth-provider";
import { Bell, Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  return (
    <div className="bg-white border-b-2 border-[#333] shadow-[0_4px_0_0_#333] py-2 px-4 md:px-6">
      <div className="flex items-center justify-between">
        {/* Left side - Search */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border-2 border-[#333] shadow-[0_2px_0_0_#333] focus:shadow-[0_4px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-md bg-white hover:bg-[#fafafa] focus:outline-none"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </form>
        </div>

        {/* Right side - User info and actions */}
        <div className="flex items-center ml-4 space-x-4">
          {/* Notification bell */}
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
              <Bell className="h-5 w-5 text-[#333]" />
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white text-[10px] flex items-center justify-center text-white">
                3
              </span>
            </button>
          </div>

          {/* Messages */}
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <MessageSquare className="h-5 w-5 text-[#333]" />
              <span className="absolute top-0 right-0 h-4 w-4 bg-blue-500 rounded-full border-2 border-white text-[10px] flex items-center justify-center text-white">
                5
              </span>
            </button>
          </div>

          {/* User profile */}
          <Link
            href="/dashboard/profile"
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white border-2 border-[#333] shadow-[0_2px_0_0_#333] flex items-center justify-center overflow-hidden">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
            <span className="hidden md:block font-mono text-sm text-[#333]">
              {user?.first_name}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
