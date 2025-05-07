/**
 * Login API methods
 * Contains all API calls related to user login
 */

import { api } from '@/lib/api-client';
import { User } from '@/providers/auth-provider';
import { setAuthCookies, getCsrfToken } from '@/lib/cookies';

// API endpoints
const ENDPOINTS = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VALIDATE_TOKEN: '/auth/validate',
  REFRESH_TOKEN: '/auth/refresh',
  REVOKE_TOKEN: '/auth/revoke',
};

/**
 * Login with email and password
 */
export async function login(email: string, password: string) {
  const response = await api.post<{ 
    token: string; 
    user: User; 
    message: string; 
    csrf_token: string;
    permanent_token: string;
    expires_at: number;
  }>(
    ENDPOINTS.LOGIN,
    { email, password },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle the response data structure
  const { token, user, permanent_token, expires_at } = response.data;
  
  // Log the response structure for debugging
  console.log('Login response:', response.data);
  
  // Store auth data in cookies
  setAuthCookies(token, user);
  
  // Store permanent token in localStorage for token refresh
  // This is safe because it's only used for refreshing the HTTP-only cookie
  // The actual authentication is done with the HTTP-only cookie
  if (permanent_token) {
    localStorage.setItem('permanent_token', permanent_token);
    localStorage.setItem('token_expires_at', expires_at.toString());
  }
  
  return { token, user, permanent_token, expires_at };
}

/**
 * Request a password reset
 */
export async function forgotPassword(email: string) {
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.FORGOT_PASSWORD,
    { email },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.RESET_PASSWORD,
    { token, password: newPassword },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Refresh the temporary token using the permanent token
 */
export async function refreshToken(): Promise<{ token: string; expires_at: number } | null> {
  // Get permanent token from localStorage
  const permanentToken = localStorage.getItem('permanent_token');
  if (!permanentToken) {
    console.log('No permanent token found for refresh');
    return null;
  }

  try {
    const response = await api.post<{ token: string; expires_at: number; message: string }>(
      ENDPOINTS.REFRESH_TOKEN,
      { permanent_token: permanentToken },
      { requiresAuth: false }
    );

    if (response.error) {
      console.error('Token refresh failed:', response.error);
      return null;
    }

    // Update expiration time in localStorage
    if (response.data.expires_at) {
      localStorage.setItem('token_expires_at', response.data.expires_at.toString());
    }

    return {
      token: response.data.token,
      expires_at: response.data.expires_at
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Validate an authentication token
 * With HTTP-only cookies, the token is automatically sent with the request
 * The token parameter is only used as a fallback for backward compatibility
 */
export async function validateToken(token?: string): Promise<boolean> {
  console.log('Validating token - HTTP-only cookies should be sent automatically');
  
  try {
    const response = await api.get<{ valid: boolean }>(
      ENDPOINTS.VALIDATE_TOKEN,
      {
        headers: {
          // Only include Authorization header if we have a token and it's not the dummy HTTP-only token
          ...(token && token !== 'http-only-cookie' ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-CSRF-Token': getCsrfToken() || '',
        },
        // This ensures cookies are sent with the request
        credentials: 'include',
        requiresAuth: false
      }
    );
    
    console.log('Token validation response:', response);
    
    if (response.error || !response.data.valid) {
      console.log('Token validation failed:', response.error || 'Invalid token');
      return false;
    }
    
    console.log('Token validation successful');
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}