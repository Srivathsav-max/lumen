/**
 * Centralized API client for making authenticated requests
 * This handles token management, CSRF protection, token refresh, authentication redirection,
 * and common request patterns
 */

import { getAuthToken, getCsrfToken, generateCsrfToken, clearAuthCookies } from './cookies';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Token refresh endpoint
const TOKEN_REFRESH_ENDPOINT = '/auth/refresh';

// Login page URL
const LOGIN_PAGE = '/auth/login';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Flag to prevent multiple redirects
let isRedirecting = false;

// Queue of requests to retry after token refresh
let refreshQueue: Array<() => void> = [];

// Types for API requests
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: RequestMethod;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  requiresCsrf?: boolean;
  credentials?: RequestCredentials;
  skipTokenRefresh?: boolean; // Skip token refresh for certain requests (like refresh itself)
  skipAuthRedirect?: boolean; // Skip redirection to login page on auth failure
}

interface ApiResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

/**
 * Process the refresh queue with success or failure
 */
function processRefreshQueue(success: boolean): void {
  // Execute all queued requests with the refreshed token
  refreshQueue.forEach(callback => callback());
  // Clear the queue
  refreshQueue = [];
}

/**
 * Redirect to login page for authentication failures
 * Prevents multiple redirects and clears auth cookies
 */
function redirectToLogin(): void {
  // Prevent multiple redirects
  if (isRedirecting) return;
  isRedirecting = true;
  
  // Clear all authentication cookies
  clearAuthCookies();
  
  // Only redirect if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Store the current URL to redirect back after login
    const currentPath = window.location.pathname;
    if (currentPath !== LOGIN_PAGE && !currentPath.startsWith('/auth/')) {
      // Store the return URL in sessionStorage
      sessionStorage.setItem('returnUrl', currentPath);
    }
    
    console.log('Redirecting to login page due to authentication failure');
    window.location.href = LOGIN_PAGE;
  }
  
  // Reset the flag after a delay
  setTimeout(() => {
    isRedirecting = false;
  }, 3000);
}

/**
 * Refresh the authentication token
 */
async function refreshToken(): Promise<boolean> {
  if (isRefreshing) return new Promise(resolve => {
    // Add a callback to the queue that resolves the promise
    refreshQueue.push(() => resolve(true));
  });

  isRefreshing = true;

  try {
    // Call the token refresh endpoint
    const response = await fetch(`${API_BASE_URL}${TOKEN_REFRESH_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
    });

    // Check if refresh was successful
    const success = response.ok;
    
    // Generate a new CSRF token
    if (success) {
      generateCsrfToken();
    }

    // Process the queue with the result
    processRefreshQueue(success);
    isRefreshing = false;
    return success;
  } catch (error) {
    // Process the queue with failure
    processRefreshQueue(false);
    isRefreshing = false;
    return false;
  }
}

/**
 * Make an API request with proper error handling, authentication, and token refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    requiresAuth = true,
    requiresCsrf = isStateChangingMethod(method),
    credentials = 'include',
  } = options;

  // Build request URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required and available (for backward compatibility)
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    // Note: We don't return an error if token is missing because we're using HTTP-only cookies now
  }
  
  // Add CSRF token for state-changing requests
  if (requiresCsrf) {
    // Ensure we have a CSRF token - generate one if it doesn't exist
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      console.log('No CSRF token found, generating a new one');
      csrfToken = generateCsrfToken();
    }
    
    // Add the token to headers
    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken;
      // Also set the token in a cookie for cross-domain requests
      if (process.env.NODE_ENV === 'production') {
        document.cookie = `csrf_token=${csrfToken}; path=/; domain=.moxium.tech; secure; samesite=lax`;
      }
    } else {
      console.error('Failed to generate CSRF token');
    }
  }

  try {
    // Make the request
    let response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials, // Include cookies in the request
    });

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as unknown as T;
    }

    // Handle API errors
    if (!response.ok) {
      // Check if it's an authentication error (401)
      if (response.status === 401 && 
          endpoint !== TOKEN_REFRESH_ENDPOINT && 
          requiresAuth && 
          !options.skipTokenRefresh) {
        
        // Try to refresh the token
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          // Retry the original request with refreshed token
          // Get a fresh CSRF token
          if (requiresCsrf) {
            const newCsrfToken = getCsrfToken();
            if (newCsrfToken) {
              requestHeaders['X-CSRF-Token'] = newCsrfToken;
            }
          }
          
          // Retry the request
          const retryResponse = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
            credentials,
          });
          
          // Parse retry response
          let retryData: T;
          const retryContentType = retryResponse.headers.get('content-type');
          if (retryContentType && retryContentType.includes('application/json')) {
            retryData = await retryResponse.json();
          } else {
            retryData = await retryResponse.text() as unknown as T;
          }
          
          // Return the retry response
          if (retryResponse.ok) {
            return {
              data: retryData,
              status: retryResponse.status,
            };
          } else {
            return {
              data: retryData,
              error: retryData && typeof retryData === 'object' && 'error' in retryData
                ? (retryData as any).error
                : `Request failed with status ${retryResponse.status}`,
              status: retryResponse.status,
            };
          }
        } else if (!options.skipAuthRedirect) {
          // Token refresh failed, redirect to login page
          redirectToLogin();
        }
      } else if (response.status === 403 && requiresAuth && !options.skipAuthRedirect) {
        // Forbidden error - user is authenticated but doesn't have permission
        // This could be due to role restrictions or other authorization issues
        console.error('Access forbidden:', endpoint);
      }
      
      return {
        data,
        error: data && typeof data === 'object' && 'error' in data 
          ? (data as any).error 
          : `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    // Return successful response
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    // Handle network errors
    console.error('API request failed:', error);
    
    // Check if it's likely an authentication issue
    if (requiresAuth && !options.skipAuthRedirect) {
      // For network errors on authenticated endpoints, we might want to check auth status
      // This is optional and depends on your error handling strategy
      const authToken = getAuthToken();
      if (!authToken) {
        redirectToLogin();
      }
    }
    
    return {
      data: null as T,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 0,
    };
  }
}

/**
 * Helper functions for common request types
 */
/**
 * Helper function to determine if a method is state-changing
 * State-changing methods require CSRF protection
 */
function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
}

export const api = {
  get: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T = any>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
    
  delete: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
    
  patch: <T = any>(endpoint: string, body: any, options?: Omit<RequestOptions, 'method'>) => 
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
};
