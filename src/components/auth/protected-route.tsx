"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, validateToken, token } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only check authentication once when the component mounts
    // or when authentication state changes significantly
    if (!authChecked && !isLoading && !isRedirecting) {
      const checkAuth = async () => {
        // Check if we have a token in localStorage but no user yet
        // This handles the case right after login before state is fully updated
        const storedToken = localStorage.getItem('auth_token');
        
        if (!storedToken) {
          // No token in localStorage, definitely not authenticated
          setIsRedirecting(true);
          router.push("/login");
          return;
        }
        
        if (!isAuthenticated) {
          // We have a token but no user yet, validate the token
          const isValid = await validateToken();
          if (!isValid) {
            setIsRedirecting(true);
            router.push("/login");
            return;
          }
        }
        
        setAuthChecked(true);
      };

      checkAuth();
    }
  }, [isAuthenticated, isLoading, router, validateToken, authChecked, token, isRedirecting]);

  if (isLoading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Check if we have a token in localStorage even if isAuthenticated is false
  // This handles the case right after login before state is fully updated
  const hasToken = !!localStorage.getItem('auth_token');
  
  if (!isAuthenticated && !hasToken) {
    // Only block rendering if we're definitely not authenticated
    return null;
  }

  return <>{children}</>;
};
