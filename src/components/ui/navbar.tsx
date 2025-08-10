"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/hooks/use-auth";
import { AuthNav } from "./auth-nav";

export const Navbar = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/20 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-gray-800/20 dark:bg-black/80 dark:supports-[backdrop-filter]:bg-black/60">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Star className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">Lumen</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center space-x-8 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/features"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Pricing
            </Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <AuthNav />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="h-9 rounded-lg text-sm font-medium">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
