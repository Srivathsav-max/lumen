"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  clearAuthCookies,
  getAuthToken,
  getUserData,
  getUserRole,
  setAuthCookies,
  setUserData,
} from '@/lib/cookies';
import { api } from '@/lib/api-client';
import * as authHandlers from '@/handlers';
import { TOKEN_VALIDATION_CACHE_TIME } from '@/handlers/token-handler';

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
  login: (email: string, password: string) => Promise<void>;
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

  // Check if token needs to be refreshed - uses token handler
  const checkAndRefreshToken = useCallback(async () => {
    return await authHandlers.checkAndRefreshToken();
  }, []);

  // Initialize auth state from cookies on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          // Try to load cached user data first
          const userData = getUserData();
          if (userData) {
            setUser(userData);
          }
          
          // Only validate token if we don't have user data or it's been a while
          const now = Date.now();
          const shouldValidate = !user || (now - lastValidated > TOKEN_VALIDATION_CACHE_TIME);
          
          if (shouldValidate) {
            await validateToken();
          }
        } catch (error) {
          // If token validation fails, clear auth state
          clearAuthCookies();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  // Login function - uses login handler
  const handleLogin = async (email: string, password: string) => {
    return await authHandlers.handleLogin(
      email, 
      password, 
      setUser, 
      setToken, 
      setLastValidated, 
      setIsLoading, 
      router
    );
  };

  // Logout function - uses logout handler
  const handleLogout = async () => {
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

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
