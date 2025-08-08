"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Toast notifications will be handled by components
import {
  clearAuthCookies,
  isAuthenticated as checkIsAuthenticated,
  getUserData,
} from '@/lib/cookies';
import * as authHandlers from '@/handlers';
import { TOKEN_VALIDATION_CACHE_TIME } from '@/handlers/token-handler';
import { initTokenRefreshService, scheduleTokenRefresh, refreshToken as refreshAuthToken, cleanupTokenRefreshService } from '@/lib/token-refresh-service';

// Define user type
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles?: string[];
  is_admin?: boolean;
}

// Define auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => Promise<User | undefined>;
  isRegistrationEnabled: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
}

// Define register data type
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Constants are now imported from token-handler.ts

// Create the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastValidated, setLastValidated] = useState<number>(0);
  const validationInProgress = useRef<boolean>(false);
  const router = useRouter();

  // For debugging
  useEffect(() => {
    console.log('AuthProvider - Current state:', {
      user: user ? 'exists' : 'null',
      token: token ? 'exists' : 'null',
      isLoading,
      lastValidated
    });
  }, [user, token, isLoading, lastValidated]);

  // Check if token needs to be refreshed - uses our enhanced token refresh service
  const checkAndRefreshToken = useCallback(async () => {
    // Use our new token refresh service for better persistence
    const refreshResult = await refreshAuthToken();
    
    // If refresh fails, fall back to the original handler as backup
    if (!refreshResult) {
      return await authHandlers.checkAndRefreshToken();
    }
    
    return refreshResult;
  }, []);

  // Initialize auth state from cookies on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing auth state after page load/refresh');

      // Try to load cached user data first
      const userData = getUserData();
      const isAuth = checkIsAuthenticated();

      // Update state with what we have from cookies
      if (userData) {
        console.log('Found cached user data');
        setUser(userData);
      }

      // HTTP-only tokens can't be read by JavaScript, so we check authentication status
      if (isAuth) {
        console.log('User appears to be authenticated');
        setToken('authenticated'); // Placeholder since we can't read HTTP-only cookies
      }

      // If we have user data, validate the session
      if (userData && isAuth) {
        console.log('Validating token after page refresh');
        try {
          // Validate the token with the server
          await validateToken();
          
          // Initialize the token refresh service
          initTokenRefreshService();
          
          // Schedule the first token refresh
          scheduleTokenRefresh();
        } catch (error) {
          console.error('Token validation failed:', error);
          // If token validation fails, clear auth state
          clearAuthCookies();
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
    
    // Cleanup function to ensure token refresh service is properly stopped
    return () => {
      cleanupTokenRefreshService();
    };
  }, []);

  // Login function - uses login handler
  const handleLogin = async (email: string, password: string) => {
    try {
      await authHandlers.handleLogin(
        email,
        password,
        setUser,
        setToken,
        setLastValidated,
        setIsLoading,
        router
      );
      
      // If login was successful (no exception thrown), initialize token refresh service
      initTokenRefreshService();
      scheduleTokenRefresh();
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // Logout function - uses logout handler
  const handleLogout = async () => {
    // Clean up the token refresh service before logout
    cleanupTokenRefreshService();
    
    return await authHandlers.handleLogout(
      setUser,
      setToken,
      setLastValidated,
      router
    );
  };

  // Validate token function with debouncing and caching - uses token handler
  const validateToken = useCallback(async (): Promise<boolean> => {
    return await authHandlers.validateToken(
      user,
      lastValidated,
      validationInProgress,
      setUser,
      setLastValidated,
      TOKEN_VALIDATION_CACHE_TIME
    );
  }, [user, lastValidated]);

  // Update profile function - uses profile handler
  const handleUpdateProfile = async (userData: Partial<User>) => {
    return await authHandlers.handleUpdateProfile(
      userData,
      user,
      token,
      setUser,
      setIsLoading
    );
  };

  // Check if registration is enabled - uses register handler
  const isRegistrationEnabled = async (): Promise<boolean> => {
    return await authHandlers.isRegistrationEnabled();
  };

  // Register function - uses register handler
  const register = async (userData: RegisterData) => {
    return await authHandlers.handleRegister(
      userData,
      setUser,
      setToken,
      setLastValidated,
      setIsLoading,
      router
    );
  };

  const contextValue = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    setUser,
    login: handleLogin,
    logout: handleLogout,
    register,
    validateToken,
    updateProfile: handleUpdateProfile,
    isRegistrationEnabled,
    refreshToken: checkAndRefreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth hook is now imported from @/hooks/use-auth
