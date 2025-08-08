/**
 * Centralized API client for making authenticated requests
 * This handles comprehensive security including CSRF, XSS protection, JWT authentication,
 * and secure request patterns following OWASP guidelines
 */

import { clearAuthCookies } from './cookies';
import securityService from './security/security-service';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
console.log('API_BASE_URL configured as:', API_BASE_URL);

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
  credentials?: RequestCredentials;
  skipTokenRefresh?: boolean;
  skipAuthRedirect?: boolean;
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
    
    // HTTP-only cookies are updated automatically by backend

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
    // CSRF removed for simplified authentication
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

  // Add comprehensive security headers
  const secureHeaders = securityService.addCSRFToHeaders(requestHeaders as Record<string, string>);
  
  // Add browser fingerprint for enhanced security
  const fingerprint = securityService.getFingerprint();
  if (fingerprint) {
    secureHeaders['X-Browser-Fingerprint'] = fingerprint;
  }
  
  // Update request headers with security headers
  Object.assign(requestHeaders, secureHeaders);

  try {
    console.log('=== SECURE API REQUEST ===');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Headers:', Object.keys(requestHeaders)); // Don't log sensitive values
    console.log('Body Length:', body ? JSON.stringify(body).length : 0);
    console.log('Credentials:', credentials);
    console.log('Security Features:', {
      csrf: !!securityService.getCSRFToken(),
      fingerprint: !!securityService.getFingerprint(),
      xss_protection: true
    });
    
    // Make the request with sanitized body
    let response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(securityService.sanitizeJSON(body)) : undefined,
      credentials, // Include cookies in the request
    });
    
    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    console.log('OK:', response.ok);

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('Parsed JSON data:', data);
    } else {
      data = await response.text() as unknown as T;
      console.log('Parsed text data:', data);
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
          // HTTP-only cookies are updated automatically
          
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
        } else if (!options.skipAuthRedirect && !endpoint.includes('/profile') && !endpoint.includes('/notes/') && !endpoint.includes('/ai/')) {
          // Token refresh failed, redirect to login page
          // But skip redirect for profile endpoints and notes endpoints to prevent logout on content save errors
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
    if (requiresAuth && !options.skipAuthRedirect && !endpoint.includes('/profile') && !endpoint.includes('/notes/') && !endpoint.includes('/ai/')) {
      // For network errors on authenticated endpoints, redirect to login
      // But skip redirect for profile endpoints and notes endpoints to prevent logout on content save errors
      // HTTP-only cookies handle authentication state
      redirectToLogin();
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
