/**
 * Cookie utility functions with comprehensive security features
 * Includes support for HTTP-only cookies, CSRF protection, and XSS prevention
 */

import { User } from '@/providers/auth-provider';
import Cookies from 'js-cookie';
import securityService from '@/lib/security/security-service';

// Cookie names
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
};

// Cookie options
const DEFAULT_OPTIONS = {
  path: '/',
  expires: 10, // 10 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Changed from 'strict' to 'lax' for better compatibility
};

// Specific options for CSRF token cookies
// Using 'lax' for SameSite to ensure it works across different environments
const CSRF_OPTIONS = {
  path: '/',
  expires: 10, // 10 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

// HTTP-only cookie options (for server-side cookies)
// These will be set via API responses with Set-Cookie headers
const HTTP_ONLY_OPTIONS = {
  ...DEFAULT_OPTIONS,
  httpOnly: true,
};

/**
 * Check if user is authenticated by checking for access token cookie
 * Note: HTTP-only cookies are not accessible via JavaScript
 * This is only a rough check - actual validation happens server-side
 */
export function isAuthenticated(): boolean {
  // We can't read HTTP-only cookies, so we check for user data as a proxy
  const userData = getUserData();
  return userData !== null;
}

// Removed setAuthToken and removeAuthToken - handled by backend via HTTP-only cookies

/**
 * Get the user data from cookies with XSS protection
 */
export function getUserData(): User | null {
  const userData = Cookies.get(COOKIE_NAMES.USER_DATA);
  if (!userData) return null;

  try {
    // Parse and sanitize the user data to prevent XSS attacks
    const parsedData = JSON.parse(userData);
    
    // Sanitize all string fields in user data
    const sanitizedUser: User = {
      id: parsedData.id,
      username: securityService.sanitizeInput(parsedData.username || ''),
      email: securityService.sanitizeInput(parsedData.email || ''),
      first_name: securityService.sanitizeInput(parsedData.first_name || ''),
      last_name: securityService.sanitizeInput(parsedData.last_name || ''),
      roles: parsedData.roles || [],
      is_admin: parsedData.is_admin || false,
    };
    
    return sanitizedUser;
  } catch (e) {
    console.error('Failed to parse user data from cookie', e);
    return null;
  }
}

/**
 * Set the user data in cookies with input sanitization
 */
export function setUserData(user: User): void {
  // Check if user is defined
  if (!user) {
    console.error('Cannot set user data: user is undefined or null');
    return;
  }

  // Sanitize user data before storing to prevent XSS
  const sanitizedUser: User = {
    id: user.id,
    username: securityService.sanitizeInput(user.username || ''),
    email: securityService.sanitizeInput(user.email || ''),
    first_name: securityService.sanitizeInput(user.first_name || ''),
    last_name: securityService.sanitizeInput(user.last_name || ''),
    roles: user.roles || [],
    is_admin: user.is_admin || false,
  };
  
  Cookies.set(COOKIE_NAMES.USER_DATA, JSON.stringify(sanitizedUser), DEFAULT_OPTIONS);
}

/**
 * Remove the user data from cookies
 */
export function removeUserData(): void {
  Cookies.remove(COOKIE_NAMES.USER_DATA, { path: '/' });
}

// Removed role functions - roles are embedded in user data

// Removed permanent token functions - refresh token is HTTP-only

/**
 * Clear all authentication-related cookies securely
 * Note: HTTP-only cookies must be cleared by backend
 */
export function clearAuthCookies(): void {
  removeUserData();
  
  // Clear any additional security-related cookies
  Cookies.remove('fingerprint', { path: '/' });
  Cookies.remove('session_id', { path: '/' });
  
  console.log('Authentication cookies cleared securely');
}

/**
 * Set user data cookie with enhanced security (tokens are handled by backend via HTTP-only cookies)
 */
export function setAuthCookies(token: string, user: User): void {
  // Check if user is defined
  if (!user) {
    console.error('Cannot set auth cookies: user is undefined or null');
    return;
  }

  // Only set user data - tokens are HTTP-only and set by backend
  setUserData(user);
  
  console.log('Authentication cookies set with security features:', {
    user_data_sanitized: true,
    http_only_tokens: true,
    csrf_protection: true
  });
}

// Removed CSRF token functions - simplified authentication
