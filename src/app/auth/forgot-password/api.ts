/**
 * Forgot Password API methods
 * Contains all API calls related to password reset request
 */

import { api } from '@/lib/api-client';

// API endpoints
const ENDPOINTS = {
  REQUEST_PASSWORD_RESET: '/auth/forgot-password',
};

/**
 * Request a password reset
 * Public endpoint
 */
export async function requestPasswordReset(email: string) {
  const response = await api.post<{ message: string }>(ENDPOINTS.REQUEST_PASSWORD_RESET, { email }, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
