"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { Star, Home } from "lucide-react";
import { HoverBorderGradient } from "./hover-border-gradient";
import { usePathname } from 'next/navigation';
import { AuthNav } from "./auth-nav";
import { useAuth } from "@/hooks/use-auth";

export const FloatingDock = ({
  className
}: {
  className?: string;
}) => {
  const pathname = usePathname();
  const isWaitlist = pathname === '/waitlist';
  const { isAuthenticated } = useAuth();
  return (
    <div
      className={cn(
        "absolute top-8 left-1/2 transform -translate-x-1/2 h-16 rounded-full bg-gradient-to-b from-white/50 to-white/40 backdrop-blur-3xl shadow-[0_8px_32px_rgba(255,255,255,0.15)] border border-white/40 hover:border-white/50 transition-all duration-500 hover:bg-gradient-to-b hover:from-white/60 hover:to-white/50 z-[100]",
        className
      )}
    >
      <div className="flex items-center h-full px-12 gap-16">
        {/* Left: Company Name */}
        <Link href="/" className="flex items-center gap-2">
          <Star className="h-5 w-5 text-blue-500 fill-blue-500" />
          <span className="text-gray-800 font-medium text-lg">Lumen</span>
        </Link>

        {/* Middle: Home */}
        <div className="flex-1 flex justify-center">
          <Link 
            href="/" 
            className="px-6 py-2 rounded-full hover:bg-white/50 transition-all duration-200 flex items-center gap-2 hover:shadow-[0_2px_12px_rgba(255,255,255,0.3)]"
          >
            <Home className="h-5 w-5 text-gray-700" />
            <span className="text-gray-900 font-medium">Home</span>
          </Link>
        </div>

        {/* Right: Auth Navigation or Waitlist Button */}
        <div className="flex items-center ml-auto">
          {isWaitlist ? (
            <div className="px-6 py-2 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-2">
              Coming Soon
            </div>
          ) : isAuthenticated ? (
            <AuthNav />
          ) : (
            <div className="flex items-center gap-4">
              <AuthNav />
              <Link href="/waitlist">
                <HoverBorderGradient
                  containerClassName="rounded-full"
                  className="bg-black/90 text-white flex items-center gap-2 font-medium"
                >
                  Join Waitlist
                </HoverBorderGradient>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
