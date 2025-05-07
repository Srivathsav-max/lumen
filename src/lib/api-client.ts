/**
 * Centralized API client for making authenticated requests
 * This handles token management, CSRF protection, and common request patterns
 */

import { getAuthToken, getCsrfToken } from './cookies';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Types for API requests
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: RequestMethod;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  requiresCsrf?: boolean;
  credentials?: RequestCredentials;
}

interface ApiResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

/**
 * Make an API request with proper error handling and authentication
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
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  try {
    // Make the request
    const response = await fetch(url, {
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
