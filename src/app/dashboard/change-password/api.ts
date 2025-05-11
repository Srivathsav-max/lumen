/**
 * Change Password API methods
 * Contains all API calls related to changing password
 */

import { api } from '@/lib/api-client';
import { generateCsrfToken } from '@/lib/cookies';

// API endpoints
const ENDPOINTS = {
  CHANGE_PASSWORD: '/profile/change-password',
  REQUEST_OTP: '/profile/request-password-change-otp',
};

/**
 * Request OTP for password change
 * Requires authentication
 */
export async function requestPasswordChangeOTP() {
  // Ensure we have a fresh CSRF token
  generateCsrfToken();
  
  const response = await api.post<{ message: string }>(ENDPOINTS.REQUEST_OTP, {}, {
    requiresAuth: true,
    requiresCsrf: true
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}

/**
 * Change user password with OTP verification
 * Requires authentication
 */
export async function changePassword(currentPassword: string, newPassword: string, otp: string) {
  // Ensure we have a fresh CSRF token
  generateCsrfToken();
  
  const response = await api.post<{ message: string }>(ENDPOINTS.CHANGE_PASSWORD, { 
    current_password: currentPassword,
    new_password: newPassword,
    otp: otp
  }, {
    requiresAuth: true,
    requiresCsrf: true
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
