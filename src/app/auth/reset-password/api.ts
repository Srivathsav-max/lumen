/**
 * Reset Password API methods
 * Contains all API calls related to password reset
 */

import { api } from '@/lib/api-client';

// API endpoints
const ENDPOINTS = {
  RESET_PASSWORD: '/auth/reset-password',
};

/**
 * Reset password with token
 * Public endpoint
 */
export async function resetPassword(token: string, newPassword: string) {
  const response = await api.post<{ message: string }>(ENDPOINTS.RESET_PASSWORD, { 
    token,
    password: newPassword // Backend expects 'password', not 'newPassword'
  }, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
