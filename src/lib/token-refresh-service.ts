/**
 * Token Refresh Service
 * 
 * This service manages token refresh to maintain persistent sessions.
 * It proactively refreshes tokens before they expire to ensure users
 * remain logged in for the full 10-day period or until they explicitly log out.
 */

import { api } from './api-client';
import { getAuthToken, getUserData } from './cookies';

// Configuration
const TOKEN_REFRESH_ENDPOINT = '/auth/refresh';

// Token expiration and refresh configuration
const TOKEN_EXPIRY_MINUTES = 15; // Backend temporary tokens expire after 15 minutes
const REFRESH_BEFORE_EXPIRY_MINUTES = 5; // Refresh 5 minutes before expiration
const TOKEN_CHECK_INTERVAL = 1000 * 60 * 1; // Check token every 1 minute

// Calculate refresh time based on when token was last refreshed
const getRefreshTime = (lastRefreshTime: number): number => {
  const tokenExpiryMs = lastRefreshTime + (TOKEN_EXPIRY_MINUTES * 60 * 1000);
  const refreshTimeMs = tokenExpiryMs - (REFRESH_BEFORE_EXPIRY_MINUTES * 60 * 1000);
  return refreshTimeMs;
};

// Service state
let refreshTimerId: NodeJS.Timeout | null = null;
let checkTimerId: NodeJS.Timeout | null = null;
let isRefreshing = false;
let lastRefreshTime = Date.now(); // Track when token was last refreshed

/**
 * Initialize the token refresh service
 * This should be called when the application starts
 */
export function initTokenRefreshService(): void {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  console.log('Initializing token refresh service');
  
  // Start the token check interval
  startTokenCheck();
  
  // Add event listeners for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Add event listener for online/offline status
  window.addEventListener('online', handleOnlineStatus);
}

/**
 * Start the token check interval
 * This periodically checks if the token needs refreshing
 */
function startTokenCheck(): void {
  // Clear any existing timer
  if (checkTimerId) {
    clearInterval(checkTimerId);
  }
  
  // Set up a new check interval
  checkTimerId = setInterval(() => {
    const token = getAuthToken();
    const userData = getUserData();
    
    // If we have a token and user data, check if we need to refresh
    if (token && userData) {
      const now = Date.now();
      const nextRefreshTime = getRefreshTime(lastRefreshTime);
      
      // If it's time to refresh (or past time)
      if (now >= nextRefreshTime) {
        console.log('Token approaching expiration, refreshing now');
        refreshToken();
      } else {
        // Schedule the next refresh at the appropriate time
        scheduleTokenRefresh(nextRefreshTime - now);
      }
    } else {
      // No token or user data, clear any scheduled refresh
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    }
  }, TOKEN_CHECK_INTERVAL);
}

/**
 * Schedule a token refresh
 * This sets up a timer to refresh the token before it expires
 */
export function scheduleTokenRefresh(delay?: number): void {
  // Don't schedule if already refreshing or if a refresh is already scheduled
  if (isRefreshing || refreshTimerId) return;
  
  // Calculate time until next refresh if not provided
  const refreshDelay = delay || 
    ((TOKEN_EXPIRY_MINUTES - REFRESH_BEFORE_EXPIRY_MINUTES) * 60 * 1000);
  
  console.log(`Scheduling token refresh in ${Math.round(refreshDelay / 1000 / 60)} minutes`);
  
  // Set up the refresh timer
  refreshTimerId = setTimeout(() => {
    refreshToken();
    refreshTimerId = null;
  }, refreshDelay);
}

/**
 * Refresh the authentication token
 * This calls the token refresh endpoint to get a new token
 */
export async function refreshToken(): Promise<boolean> {
  // Don't refresh if already refreshing
  if (isRefreshing) return false;
  
  isRefreshing = true;
  console.log('Refreshing authentication token');
  
  try {
    // Call the token refresh endpoint
    const response = await api.post(TOKEN_REFRESH_ENDPOINT, {}, {
      skipTokenRefresh: true, // Avoid infinite loops
      skipAuthRedirect: true, // Don't redirect on failure
    });
    
    // Check if refresh was successful
    const success = response.status === 200 && !response.error;
    
    if (success) {
      console.log('Token refresh successful');
      // Update last refresh time
      lastRefreshTime = Date.now();
      // Schedule the next refresh based on token expiration
      const nextRefreshDelay = (TOKEN_EXPIRY_MINUTES - REFRESH_BEFORE_EXPIRY_MINUTES) * 60 * 1000;
      scheduleTokenRefresh(nextRefreshDelay);
    } else {
      console.error('Token refresh failed:', response.error);
    }
    
    isRefreshing = false;
    return success;
  } catch (error) {
    console.error('Token refresh error:', error);
    isRefreshing = false;
    return false;
  }
}

/**
 * Handle visibility change events
 * When the page becomes visible after being hidden, check if we need to refresh the token
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    console.log('Page became visible, checking authentication status');
    const token = getAuthToken();
    const userData = getUserData();
    
    if (token && userData) {
      // Refresh token immediately if we've been away for a while
      refreshToken();
    }
  }
}

/**
 * Handle online status changes
 * When the browser comes back online, check if we need to refresh the token
 */
function handleOnlineStatus(): void {
  console.log('Browser came online, checking authentication status');
  const token = getAuthToken();
  const userData = getUserData();
  
  if (token && userData) {
    // Refresh token immediately
    refreshToken();
  }
}

/**
 * Clean up the token refresh service
 * This should be called when the user logs out
 */
export function cleanupTokenRefreshService(): void {
  console.log('Cleaning up token refresh service');
  
  // Clear timers
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
  
  if (checkTimerId) {
    clearInterval(checkTimerId);
    checkTimerId = null;
  }
  
  // Remove event listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnlineStatus);
}
