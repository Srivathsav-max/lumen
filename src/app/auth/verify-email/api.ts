/**
 * Email Verification API methods
 * Contains all API calls related to email verification
 */

import { api } from '@/lib/api-client';

// API endpoints
const ENDPOINTS = {
  VERIFY_EMAIL: '/auth/verify-email',
  REQUEST_VERIFICATION: '/auth/request-verification',
};

/**
 * Verify email with token
 * Public endpoint
 */
export async function verifyEmail(token: string) {
  const response = await api.post<{ message: string }>(ENDPOINTS.VERIFY_EMAIL, { token }, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}

/**
 * Request a new verification email
 * Public endpoint
 */
export async function requestVerification(email: string) {
  const response = await api.post<{ message: string }>(ENDPOINTS.REQUEST_VERIFICATION, { email }, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
