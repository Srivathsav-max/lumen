/**
 * Cookie utility functions for managing authentication and user data
 * Includes support for HTTP-only cookies and CSRF protection
 */

import { User } from '@/providers/auth-provider';
import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';

// Cookie names
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  USER_ROLE: 'user_role',
  CSRF_TOKEN: 'csrf_token',
  PERMANENT_TOKEN: 'permanent_token',
};

// Cookie options
const DEFAULT_OPTIONS = {
  path: '/',
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

// HTTP-only cookie options (for server-side cookies)
// These will be set via API responses with Set-Cookie headers
const HTTP_ONLY_OPTIONS = {
  ...DEFAULT_OPTIONS,
  httpOnly: true,
};

/**
 * Get the authentication token from cookies
 * Note: With HTTP-only cookies, this function will return a dummy token
 * The actual token is in the HTTP-only cookie that's automatically sent with requests
 */
export function getAuthToken(): string | null {
  // Only check client-side cookie - HTTP-only cookies are not accessible via JavaScript
  const cookieToken = Cookies.get(COOKIE_NAMES.AUTH_TOKEN);
  if (cookieToken) {
    console.log('Found auth token in client-side cookie');
    return cookieToken;
  }

  // Check if we have user data - if so, we likely have an HTTP-only cookie
  // Return a dummy token to indicate we should try to use the HTTP-only cookie
  const userData = getUserData();
  if (userData) {
    console.log('No client-side token, but found user data - returning dummy token for HTTP-only cookie');
    return 'http-only-cookie';
  }

  console.log('No client-side auth token found');
  return null;
}

/**
 * Set the authentication token in cookies
 * Note: The HTTP-only version should be set by the server
 * This is a fallback for client-side operations
 */
export function setAuthToken(token: string): void {
  // Client-side cookie for immediate access
  Cookies.set(COOKIE_NAMES.AUTH_TOKEN, token, DEFAULT_OPTIONS);
}

/**
 * Remove the authentication token from cookies
 */
export function removeAuthToken(): void {
  Cookies.remove(COOKIE_NAMES.AUTH_TOKEN, { path: '/' });
}

/**
 * Get the user data from cookies
 */
export function getUserData(): User | null {
  const userData = Cookies.get(COOKIE_NAMES.USER_DATA);
  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch (e) {
    console.error('Failed to parse user data from cookie', e);
    return null;
  }
}

/**
 * Set the user data in cookies
 */
export function setUserData(user: User): void {
  Cookies.set(COOKIE_NAMES.USER_DATA, JSON.stringify(user), DEFAULT_OPTIONS);
}

/**
 * Remove the user data from cookies
 */
export function removeUserData(): void {
  Cookies.remove(COOKIE_NAMES.USER_DATA, { path: '/' });
}

/**
 * Get the user role from cookies
 */
export function getUserRole(): string | null {
  return Cookies.get(COOKIE_NAMES.USER_ROLE) || null;
}

/**
 * Set the user role in cookies
 */
export function setUserRole(role: string): void {
  Cookies.set(COOKIE_NAMES.USER_ROLE, role, DEFAULT_OPTIONS);
}

/**
 * Remove the user role from cookies
 */
export function removeUserRole(): void {
  Cookies.remove(COOKIE_NAMES.USER_ROLE, { path: '/' });
}

/**
 * Get the permanent token from cookies
 */
export function getPermanentToken(): string | null {
  return Cookies.get(COOKIE_NAMES.PERMANENT_TOKEN) || null;
}

/**
 * Set the permanent token in cookies
 */
export function setPermanentToken(token: string): void {
  Cookies.set(COOKIE_NAMES.PERMANENT_TOKEN, token, DEFAULT_OPTIONS);
}

/**
 * Remove the permanent token from cookies
 */
export function removePermanentToken(): void {
  Cookies.remove(COOKIE_NAMES.PERMANENT_TOKEN, { path: '/' });
}

/**
 * Clear all authentication-related cookies
 */
export function clearAuthCookies(): void {
  removeAuthToken();
  removeUserData();
  removeUserRole();
  removePermanentToken();
  removeCsrfToken();
}

/**
 * Set all authentication-related cookies
 * Note: The HTTP-only versions should be set by the server
 * This is a fallback for client-side operations
 */
export function setAuthCookies(token: string, user: User, permanentToken?: string): void {
  setAuthToken(token);
  setUserData(user);

  // Set permanent token if provided
  if (permanentToken) {
    setPermanentToken(permanentToken);
  }

  // Set role cookie if user has roles
  if (user.roles && user.roles.length > 0) {
    // Use the highest privilege role if multiple exist
    const role = user.roles.includes('admin')
      ? 'admin'
      : user.roles.includes('developer')
        ? 'developer'
        : user.roles[0];

    setUserRole(role);
  }

  // Generate and set CSRF token
  generateCsrfToken();
}

/**
 * Generate and set a CSRF token
 */
export function generateCsrfToken(): string {
  const token = uuidv4();
  Cookies.set(COOKIE_NAMES.CSRF_TOKEN, token, HTTP_ONLY_OPTIONS);
  return token;
}

/**
 * Get the current CSRF token
 */
export function getCsrfToken(): string | null {
  return Cookies.get(COOKIE_NAMES.CSRF_TOKEN) || null;
}

/**
 * Remove the CSRF token
 */
export function removeCsrfToken(): void {
  Cookies.remove(COOKIE_NAMES.CSRF_TOKEN, { path: '/' });
}
