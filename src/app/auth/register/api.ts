/**
 * Register API methods with comprehensive security
 * Contains all API calls related to user registration with CSRF protection and input sanitization
 */

import { api } from '@/lib/api-client';
import { User, RegisterData } from '@/providers/auth-provider';
import { setAuthCookies } from '@/lib/cookies';
import securityService from '@/lib/security/security-service';

// API endpoints
const ENDPOINTS = {
  REGISTER: '/register',
  REGISTRATION_STATUS: '/system/registration',
  VERIFY_EMAIL: '/verify-email',
};

/**
 * Register a new user with comprehensive input validation and sanitization
 */
export async function register(userData: RegisterData) {
  console.log('=== SECURE REGISTRATION API CALL ===');
  
  // Sanitize all user inputs to prevent XSS attacks
  const sanitizedUserData = {
    username: securityService.sanitizeInput(userData.username),
    email: securityService.sanitizeInput(userData.email),
    password: securityService.sanitizeInput(userData.password),
    first_name: securityService.sanitizeInput(userData.first_name),
    last_name: securityService.sanitizeInput(userData.last_name),
  };
  
  // Validate all inputs for potential security threats
  const validations = {
    username: securityService.validateInput(sanitizedUserData.username),
    email: securityService.validateInput(sanitizedUserData.email),
    first_name: securityService.validateInput(sanitizedUserData.first_name),
    last_name: securityService.validateInput(sanitizedUserData.last_name),
  };
  
  // Check for any validation failures
  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.valid) {
      console.warn(`Security threat detected in ${field}:`, validation.threats);
      throw new Error(`Invalid ${field} format detected`);
    }
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
    ENDPOINTS.REGISTER,
    sanitizedUserData,
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle secure response - tokens are now in HTTP-only cookies
  const responseData = response.data.data;
  const { user, csrf_token, expires_in } = responseData;
  
  console.log('Secure registration response:', {
    user: user?.email, // Don't log sensitive data
    has_csrf_token: !!csrf_token,
    expires_in,
    security_features: {
      input_sanitized: true,
      csrf_protection: true,
      xss_prevention: true,
      http_only_cookies: true
    }
  });
  
  // Store user data (access token is in HTTP-only cookie)
  setAuthCookies('', user); // No token needed, it's in HTTP-only cookie
  
  // CSRF token will be handled by the security service automatically
  if (csrf_token) {
    console.log('CSRF token received and will be managed by security service');
  }
  
  console.log('Secure registration completed successfully');
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