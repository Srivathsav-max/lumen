"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Define user type
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

// Define auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
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
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Cache validation for 5 minutes (300000 ms)
const TOKEN_VALIDATION_CACHE_TIME = 300000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastValidated, setLastValidated] = useState<number>(0);
  const validationInProgress = useRef<boolean>(false);
  const router = useRouter();

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          // Try to load cached user data first
          const cachedUserData = localStorage.getItem('auth_user');
          if (cachedUserData) {
            try {
              const userData = JSON.parse(cachedUserData);
              setUser(userData);
            } catch (e) {
              // Invalid cached user data, will validate token instead
            }
          }
          
          // Only validate token if we don't have user data or it's been a while
          const now = Date.now();
          const shouldValidate = !user || (now - lastValidated > TOKEN_VALIDATION_CACHE_TIME);
          
          if (shouldValidate) {
            await validateToken();
          }
        } catch (error) {
          // If token validation fails, clear auth state
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data in localStorage for immediate access
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Update state
      setToken(data.token);
      setUser(data.user);
      setLastValidated(Date.now());
      toast.success('Login successful');
      
      // Use window.location for a full page navigation to ensure proper state initialization
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token and user data in localStorage for immediate access
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Update state
      setToken(data.token);
      setUser(data.user);
      setLastValidated(Date.now());
      toast.success('Registration successful');
      
      // Use window.location for a full page navigation to ensure proper state initialization
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    setLastValidated(0);
    toast.success('Logged out successfully');
    // Use window.location for a full page navigation
    window.location.href = '/login';
  };

  // Validate token function with debouncing and caching
  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    
    // Check if validation is already in progress
    if (validationInProgress.current) {
      return !!user; // Return current authentication state
    }
    
    // Check if token was validated recently
    const now = Date.now();
    if (user && (now - lastValidated < TOKEN_VALIDATION_CACHE_TIME)) {
      return true; // Use cached validation result
    }
    
    // Set validation in progress flag
    validationInProgress.current = true;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid token');
      }

      // Update user data and cache it
      setUser(data.user);
      setLastValidated(now);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return true;
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
      return false;
    } finally {
      // Clear validation in progress flag
      validationInProgress.current = false;
    }
  }, [token, user, lastValidated]);

    // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    if (!token || !user) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update user data in state and localStorage
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      setLastValidated(Date.now());
      return data;
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
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    validateToken,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
