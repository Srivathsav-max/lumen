/**
 * Token handler
 * Contains the logic for handling token validation and refreshing
 */

import * as loginApi from '@/app/auth/login/api';
import * as profileApi from '@/app/dashboard/profile/api';
import { User } from '@/providers/auth-provider';
import { setUserData } from '@/lib/cookies';

// Constants
export const TOKEN_VALIDATION_CACHE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Check if token needs to be refreshed and refresh it if necessary
 * @returns Boolean indicating if token is valid
 */
export async function checkAndRefreshToken(): Promise<boolean> {
  try {
    // Get token expiration time from sessionStorage
    const expiresAtStr = sessionStorage.getItem('token_expires_at');
    if (!expiresAtStr) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Date.now();

    // If token is about to expire, refresh it
    if (expiresAt - now < TOKEN_REFRESH_THRESHOLD) {
      console.log('Token handler - Token about to expire, refreshing...');
      const refreshResult = await loginApi.refreshToken();

      if (refreshResult) {
        console.log('Token handler - Token refreshed successfully');
        return true;
      } else {
        console.log('Token handler - Token refresh failed');
        return false;
      }
    }

    return true; // Token is still valid
  } catch (error) {
    console.error('Error checking/refreshing token:', error);
    return false;
  }
}

/**
 * Validate authentication token
 * @param user Current user state
 * @param lastValidated Last validation timestamp
 * @param validationInProgress Reference to validation in progress flag
 * @param setUser Function to update user state
 * @param setLastValidated Function to update last validated timestamp
 * @param tokenValidationCacheTime Time in milliseconds to cache validation results
 * @returns Boolean indicating if token is valid
 */
export async function validateToken(
  user: User | null,
  lastValidated: number,
  validationInProgress: React.MutableRefObject<boolean>,
  setUser: (user: User | null) => void,
  setLastValidated: (timestamp: number) => void,
  tokenValidationCacheTime: number
): Promise<boolean> {
  console.log('Token handler - validateToken called');

  // Check if validation is already in progress
  if (validationInProgress.current) {
    console.log('Token handler - Validation already in progress, returning current state');
    return !!user; // Return current authentication state
  }

  // Check if token was validated recently
  const now = Date.now();
  if (user && (now - lastValidated < tokenValidationCacheTime)) {
    console.log('Token handler - Using cached validation result');

    // Even if using cached result, check if token needs refresh
    await checkAndRefreshToken();

    return true; // Use cached validation result
  }

  // Set validation in progress flag
  validationInProgress.current = true;
  console.log('Token handler - Starting server validation');

  // Check if token needs to be refreshed before validation
  const refreshed = await checkAndRefreshToken();
  if (!refreshed) {
    console.log('Token handler - Token refresh check failed, continuing with validation');
  }

  try {
    // With HTTP-only cookies, we don't need to pass a token
    // The cookies are automatically sent with the request
    const isValid = await loginApi.validateToken();
    console.log('Token handler - Server validation result:', isValid);

    if (!isValid) {
      console.log('Token handler - Server validation failed');
      throw new Error('Invalid session');
    }

    // Get user profile to ensure we have the latest role information
    console.log('Token handler - Getting user profile');
    const userData = await profileApi.getUserProfile();
    console.log('Token handler - User profile:', userData);

    // Update user data and cache it
    setUser(userData);
    setLastValidated(now);

    // Update user data in cookies
    setUserData(userData);

    // If we're using HTTP-only cookies, make sure token state reflects this
    if (!sessionStorage.getItem('token_expires_at')) {
      // Store a dummy expiration time far in the future to prevent unnecessary refresh attempts
      const futureExpiry = now + (24 * 60 * 60 * 1000); // 24 hours from now
      sessionStorage.setItem('token_expires_at', futureExpiry.toString());
    }

    // Reset validation in progress flag
    validationInProgress.current = false;

    return true;
  } catch (error) {
    console.error('Token validation error:', error);

    // Reset validation in progress flag
    validationInProgress.current = false;

    return false;
  }
}
