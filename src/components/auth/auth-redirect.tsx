"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthRedirectProps {
  children: React.ReactNode;
}

export const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [redirectChecked, setRedirectChecked] = useState(false);

  useEffect(() => {
    // Only check for redirect once when authentication state is determined
    // or when the pathname changes
    if (!isLoading && !redirectChecked) {
      // Only redirect if we're on login or register pages and user is authenticated
      if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
        router.push("/dashboard");
      }
      setRedirectChecked(true);
    }
  }, [isAuthenticated, isLoading, pathname, router, redirectChecked]);
  
  // Reset redirect check when pathname changes
  useEffect(() => {
    setRedirectChecked(false);
  }, [pathname]);

  return <>{children}</>;
};
