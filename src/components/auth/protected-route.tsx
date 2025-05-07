"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthToken, getUserData } from "@/lib/cookies";

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
        console.log('ProtectedRoute - Checking auth');
        // With HTTP-only cookies, we need to check both client-side state and user data
        const userData = getUserData();
        
        console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
        console.log('ProtectedRoute - User data:', userData ? 'exists' : 'missing');
        
        // If we're not authenticated in context and have no user data, we need to validate
        if (!isAuthenticated && !userData) {
          console.log('ProtectedRoute - Not authenticated, validating with server');
          // Validate with the server - this will use HTTP-only cookies automatically
          const isValid = await validateToken();
          console.log('ProtectedRoute - Server validation result:', isValid);
          
          if (!isValid) {
            console.log('ProtectedRoute - Invalid session, redirecting to login');
            setIsRedirecting(true);
            router.push("/login");
            return;
          }
        }
        
        console.log('ProtectedRoute - Auth check passed');
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
  
  // Check if we have a token in cookies even if isAuthenticated is false
  // This handles the case right after login before state is fully updated
  const hasToken = !!getAuthToken();
  const hasUserData = !!getUserData();
  
  console.log('ProtectedRoute - Render check - isAuthenticated:', isAuthenticated, 'hasToken:', hasToken, 'hasUserData:', hasUserData);
  
  // Consider authenticated if any of these conditions are true:
  // 1. isAuthenticated from context
  // 2. Has a token in cookies/localStorage
  // 3. Has user data in cookies (HTTP-only cookie case)
  const isEffectivelyAuthenticated = isAuthenticated || hasToken || hasUserData;
  
  if (!isEffectivelyAuthenticated) {
    // Only block rendering if we're definitely not authenticated
    console.log('ProtectedRoute - Not authenticated, blocking render');
    return null;
  }
  
  console.log('ProtectedRoute - Authentication passed, rendering children');

  return <>{children}</>;
};
