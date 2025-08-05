/**
 * Login API methods with comprehensive security
 * Contains all API calls related to user login with CSRF protection and XSS prevention
 */

import { api } from '@/lib/api-client';
import { User } from '@/providers/auth-provider';
import { setAuthCookies } from '@/lib/cookies';
import securityService from '@/lib/security/security-service';

// API endpoints
const ENDPOINTS = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VALIDATE_TOKEN: '/auth/validate',
  REFRESH_TOKEN: '/auth/refresh',
  REVOKE_TOKEN: '/auth/revoke',
  MAINTENANCE_STATUS: '/system/maintenance',
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
 * Login with email and password using secure authentication
 */
export async function login(email: string, password: string) {
  console.log('=== SECURE LOGIN API CALL ===');
  console.log('Endpoint:', ENDPOINTS.LOGIN);
  console.log('Email:', securityService.sanitizeInput(email)); // Log sanitized version
  
  // Sanitize inputs before sending
  const sanitizedEmail = securityService.sanitizeInput(email);
  const sanitizedPassword = securityService.sanitizeInput(password);
  
  // Validate inputs for potential threats
  const emailValidation = securityService.validateInput(sanitizedEmail);
  const passwordValidation = securityService.validateInput(sanitizedPassword);
  
  if (!emailValidation.valid) {
    throw new Error('Invalid email format detected');
  }
  
  if (!passwordValidation.valid) {
    throw new Error('Invalid password format detected');
  }
  
  const response = await api.post<{ 
    data: {
      user: User;
      expires_in: number;
      token_type: string;
      csrf_token: string;
    };
    message: string;
  }>(
    ENDPOINTS.LOGIN,
    { email: sanitizedEmail, password: sanitizedPassword },
    { requiresAuth: false }
  );
  
  console.log('Login API response:', response);
  
  if (response.error) {
    console.error('Login API error:', response.error);
    throw new Error(response.error);
  }
  
  // Handle secure response - tokens are now in HTTP-only cookies
  const responseData = response.data.data;
  const { user, csrf_token, expires_in } = responseData;
  
  console.log('Secure login response:', {
    user: user?.email, // Don't log full user data
    has_csrf_token: !!csrf_token,
    expires_in,
    security_features: {
      csrf_protection: true,
      xss_sanitization: true,
      http_only_cookies: true
    }
  });
  
  // Store user data and CSRF token (access token is in HTTP-only cookie)
  setAuthCookies('', user); // No token needed, it's in HTTP-only cookie
  
  // Store CSRF token for future API calls
  if (csrf_token) {
    // The security service will handle CSRF token storage
    console.log('CSRF token received and will be managed by security service');
  }
  
  console.log('Secure login completed successfully');
  return { 
    user, 
    csrf_token,
    expires_in,
    token: '', // Token is now in HTTP-only cookie
    permanent_token: '', // Refresh token is in HTTP-only cookie
    expires_at: Date.now() + (expires_in * 1000)
  };
}

/**
 * Request a password reset with input sanitization
 */
export async function forgotPassword(email: string) {
  // Sanitize email input to prevent XSS
  const sanitizedEmail = securityService.sanitizeInput(email);
  
  // Validate email for potential threats
  const validation = securityService.validateInput(sanitizedEmail);
  if (!validation.valid) {
    console.warn('Security threat detected in email:', validation.threats);
    throw new Error('Invalid email format detected');
  }
  
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.FORGOT_PASSWORD,
    { email: sanitizedEmail },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Reset password with token and input validation
 */
export async function resetPassword(token: string, newPassword: string) {
  // Sanitize inputs to prevent XSS
  const sanitizedToken = securityService.sanitizeInput(token);
  const sanitizedPassword = securityService.sanitizeInput(newPassword);
  
  // Validate inputs for potential threats
  const tokenValidation = securityService.validateInput(sanitizedToken);
  const passwordValidation = securityService.validateInput(sanitizedPassword);
  
  if (!tokenValidation.valid) {
    console.warn('Security threat detected in token:', tokenValidation.threats);
    throw new Error('Invalid token format detected');
  }
  
  if (!passwordValidation.valid) {
    console.warn('Security threat detected in password:', passwordValidation.threats);
    throw new Error('Invalid password format detected');
  }
  
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.RESET_PASSWORD,
    { token: sanitizedToken, password: sanitizedPassword },
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Refresh tokens using secure HTTP-only refresh cookie with CSRF protection
 */
export async function refreshToken(): Promise<{ success: boolean; csrf_token?: string } | null> {
  try {
    console.log('=== SECURE TOKEN REFRESH ===');
    
    const response = await api.post<{ 
      data: {
        expires_in: number;
        token_type: string;
        csrf_token: string;
      };
      message: string;
    }>(
      ENDPOINTS.REFRESH_TOKEN,
      {},
      { requiresAuth: false, credentials: 'include' }
    );

    if (response.error) {
      console.error('Token refresh failed:', response.error);
      return null;
    }

    console.log('Token refresh successful with security features:', {
      has_new_csrf_token: !!response.data.data.csrf_token,
      expires_in: response.data.data.expires_in,
      http_only_cookies: true
    });

    // Backend sets new access_token cookie automatically
    // New CSRF token is returned for future requests
    return { 
      success: true, 
      csrf_token: response.data.data.csrf_token 
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
export async function validateToken(): Promise<boolean> {
  console.log('Validating token - HTTP-only cookies should be sent automatically');
  
  try {
    const response = await api.get<{ valid: boolean }>(
      ENDPOINTS.VALIDATE_TOKEN,
      {
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

/**
 * Validate an authentication token and get user data with fresh roles
 * This ensures role consistency by getting roles from the database
 */
export async function validateTokenWithUserData(): Promise<{
  valid: boolean;
  data: {
    user: User;
    session_id: string;
    expires_at: number;
    roles: string[];
  };
}> {
  console.log('Validating token with user data - HTTP-only cookies should be sent automatically');
  
  try {
    const response = await api.get<{
      valid: boolean;
      data: {
        user: User;
        session_id: string;
        expires_at: number;
        roles: string[];
      };
    }>(
      ENDPOINTS.VALIDATE_TOKEN,
      {
        credentials: 'include',
        requiresAuth: false
      }
    );
    
    console.log('Token validation with user data response:', response);
    
    if (response.error || !response.data.valid) {
      console.log('Token validation failed:', response.error || 'Invalid token');
      throw new Error(response.error || 'Invalid token');
    }
    
    console.log('Token validation with user data successful');
    return response.data;
  } catch (error) {
    console.error('Token validation with user data error:', error);
    throw error;
  }
}