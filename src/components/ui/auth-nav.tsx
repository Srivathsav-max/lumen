"use client";

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AuthNav() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex items-center space-x-4">
      {isAuthenticated ? (
        <>
          <span className="text-sm hidden md:inline-block">
            Welcome, {user?.first_name}
          </span>
          <Button asChild variant="default" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </>
      ) : (
        <>
          {/* <Button asChild variant="outline" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="default" size="sm">
            <Link href="/register">Register</Link>
          </Button> */}
        </>
      )}
    </div>
  );
}
