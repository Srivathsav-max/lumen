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
import * as loginApi from '@/app/login/api';
import * as registerApi from '@/app/register/api';
import * as profileApi from '@/app/dashboard/profile/api';

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
}

// Define register data type
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Create the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache validation for 5 minutes (300000 ms)
const TOKEN_VALIDATION_CACHE_TIME = 300000;

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

  // Login function - uses login API module
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Use login API module
      const data = await loginApi.login(email, password);
      
      // Log the data for debugging
      console.log('Auth provider login data:', data);
      
      // Update state
      setToken(data.token);
      setUser(data.user);
      setLastValidated(Date.now());
      toast.success('Login successful');
      
      // Redirect based on user role
      // Use router instead of window.location for better Next.js integration
      console.log('Auth provider - Setting timeout for redirect');
      setTimeout(() => {
        // Check if user data and is_admin property exist
        if (data.user && data.user.is_admin) {
          console.log('Auth provider - Redirecting to admin dashboard');
          router.push('/dashboard'); // Admin dashboard
        } else {
          console.log('Auth provider - Redirecting to user dashboard');
          router.push('/dashboard/user'); // User dashboard
        }
      }, 500); // Increased timeout for more reliability
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if registration is enabled - uses register API module
  const isRegistrationEnabled = async (): Promise<boolean> => {
    try {
      return await registerApi.isRegistrationEnabled();
    } catch (error) {
      console.error('Error checking registration status:', error);
      return false; // Default to disabled on error
    }
  };

  // Register function - uses register API module
  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      
      // Use register API module
      const data = await registerApi.register(userData);
      
      // Update state
      setToken(data.token);
      setUser(data.user);
      setLastValidated(Date.now());
      toast.success('Registration successful');
      
      // Redirect to user dashboard as new users will have free role
      setTimeout(() => {
        window.location.href = '/dashboard/user';
      }, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call server-side logout endpoint to clear HTTP-only cookies
      await api.post('/auth/logout', {});
      
      // Clear client-side cookies
      clearAuthCookies();
      
      // Update state
      setToken(null);
      setUser(null);
      setLastValidated(0);
      toast.success('Logged out successfully');
      
      // Use router instead of window.location for better Next.js integration
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Still clear client-side cookies and state on error
      clearAuthCookies();
      setToken(null);
      setUser(null);
      setLastValidated(0);
      
      toast.error('Error during logout. Please try again.');
      
      // Redirect anyway
      router.push('/login');
    }
  };

  // Validate token function with debouncing and caching
  const validateToken = useCallback(async (): Promise<boolean> => {
    console.log('AuthProvider - validateToken called');
    
    // Check if validation is already in progress
    if (validationInProgress.current) {
      console.log('AuthProvider - Validation already in progress, returning current state');
      return !!user; // Return current authentication state
    }
    
    // Check if token was validated recently
    const now = Date.now();
    if (user && (now - lastValidated < TOKEN_VALIDATION_CACHE_TIME)) {
      console.log('AuthProvider - Using cached validation result');
      return true; // Use cached validation result
    }
    
    // Set validation in progress flag
    validationInProgress.current = true;
    console.log('AuthProvider - Starting server validation');
    
    try {
      // With HTTP-only cookies, we don't need to pass a token
      // The cookies are automatically sent with the request
      const isValid = await loginApi.validateToken();
      console.log('AuthProvider - Server validation result:', isValid);
      
      if (!isValid) {
        console.log('AuthProvider - Server validation failed');
        throw new Error('Invalid session');
      }

      // Get user profile to ensure we have the latest role information
      console.log('AuthProvider - Getting user profile');
      const userData = await profileApi.getUserProfile();
      console.log('AuthProvider - User profile:', userData);
      
      // Update user data and cache it
      setUser(userData);
      setLastValidated(now);
      
      // Update user data in cookies
      setUserData(userData);
      
      // Update token state for client-side checks
      // This is just a flag to indicate we're authenticated
      setToken('authenticated');
      
      console.log('AuthProvider - Server validation successful');
      return true;
    } catch (error) {
      // Clear all auth cookies
      clearAuthCookies();
      
      setToken(null);
      setUser(null);
      return false;
    } finally {
      // Clear validation in progress flag
      validationInProgress.current = false;
    }
  }, [token, user, lastValidated]);

    // Update profile function - uses profile API module
  const updateProfile = async (userData: Partial<User>) => {
    if (!token || !user) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use profile API module
      const updatedUser = await profileApi.updateUserProfile(userData);
      
      // Update user data in state
      setUser(updatedUser);
      setLastValidated(Date.now());
      return updatedUser;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    setUser,
    login,
    register,
    logout,
    validateToken,
    updateProfile,
    isRegistrationEnabled,
  };

  return (
    <AuthContext.Provider value={value}>
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
