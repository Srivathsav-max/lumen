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
  MAINTENANCE_STATUS: '/maintenance/status',
};

/**
 * Login with email and password
 */
/**
 * Check if the platform is in maintenance mode
 * Public endpoint that doesn't require authentication
 */
export async function isInMaintenanceMode() {
  const response = await api.get<{ maintenance_enabled: boolean }>(ENDPOINTS.MAINTENANCE_STATUS, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.maintenance_enabled;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string) {
  console.log('=== LOGIN API CALL ===');
  console.log('Endpoint:', ENDPOINTS.LOGIN);
  console.log('Email:', email);
  
  const response = await api.post<{ 
    data: {
      access_token: string;
      user: User;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };
    message: string;
  } | {
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
  
  console.log('Login API response:', response);
  
  if (response.error) {
    console.error('Login API error:', response.error);
    throw new Error(response.error);
  }
  
  // Handle the response data structure - backend returns nested data
  const responseData = 'data' in response.data ? response.data.data : response.data;
  const token = 'access_token' in responseData ? responseData.access_token : responseData.token;
  const { user } = responseData;
  const permanent_token = 'refresh_token' in responseData ? responseData.refresh_token : responseData.permanent_token;
  const expires_at = 'expires_in' in responseData ? Date.now() + (responseData.expires_in * 1000) : responseData.expires_at;
  
  // Log the response structure for debugging
  console.log('Login response data:', response.data);
  console.log('Extracted data:', responseData);
  console.log('User:', user);
  console.log('Token received:', !!token);
  
  // Store auth data in cookies
  console.log('Setting auth cookies...');
  setAuthCookies(token, user);
  
  // Store permanent token in sessionStorage for token refresh
  // This is safe because it's only used for refreshing the HTTP-only cookie
  // The actual authentication is done with the HTTP-only cookie
  if (permanent_token) {
    console.log('Storing permanent token in sessionStorage');
    sessionStorage.setItem('permanent_token', permanent_token);
    sessionStorage.setItem('token_expires_at', expires_at.toString());
  }
  
  console.log('Login API call completed successfully');
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
  // Get permanent token from sessionStorage
  const permanentToken = sessionStorage.getItem('permanent_token');
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

    // Update expiration time in sessionStorage
    if (response.data.expires_at) {
      sessionStorage.setItem('token_expires_at', response.data.expires_at.toString());
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
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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