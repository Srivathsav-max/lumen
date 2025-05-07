/**
 * Register API methods
 * Contains all API calls related to user registration
 */

import { api } from '@/lib/api-client';
import { User, RegisterData } from '@/providers/auth-provider';
import { setAuthCookies } from '@/lib/cookies';

// API endpoints
const ENDPOINTS = {
  REGISTER: '/register',
  REGISTRATION_STATUS: '/registration/status',
  VERIFY_EMAIL: '/verify-email',
};

/**
 * Register a new user
 */
export async function register(userData: RegisterData) {
  const response = await api.post<{ 
    token: string; 
    user: User; 
    permanent_token: string;
    expires_at: number;
    csrf_token: string;
  }>(
    ENDPOINTS.REGISTER,
    userData,
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle the response data structure
  const { token, user, permanent_token, expires_at } = response.data;
  
  // Store auth data in cookies
  setAuthCookies(token, user);
  
  // Store permanent token in sessionStorage for token refresh
  // This is safe because it's only used for refreshing the HTTP-only cookie
  // The actual authentication is done with the HTTP-only cookie
  if (permanent_token) {
    sessionStorage.setItem('permanent_token', permanent_token);
    sessionStorage.setItem('token_expires_at', expires_at.toString());
  }
  
  return response.data;
}

/**
 * Check if registration is enabled
 */
export async function isRegistrationEnabled() {
  const response = await api.get<{ registration_enabled: boolean }>(
    ENDPOINTS.REGISTRATION_STATUS,
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.registration_enabled;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.VERIFY_EMAIL,
    { token },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}