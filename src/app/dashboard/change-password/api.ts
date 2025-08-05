/**
 * Change Password API methods
 * Contains all API calls related to changing password
 */

import { api } from '@/lib/api-client';
import securityService from '@/lib/security/security-service';

// API endpoints
const ENDPOINTS = {
  CHANGE_PASSWORD: '/profile/change-password',
  REQUEST_OTP: '/profile/request-password-change-otp',
};

/**
 * Request OTP for password change with security features
 * Requires authentication
 */
export async function requestPasswordChangeOTP() {
  const response = await api.post<{ message: string }>(ENDPOINTS.REQUEST_OTP, {}, {
    requiresAuth: true
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}

/**
 * Change user password with OTP verification and input sanitization
 * Requires authentication
 */
export async function changePassword(currentPassword: string, newPassword: string, otp: string) {
  // Sanitize all inputs to prevent XSS attacks
  const sanitizedCurrentPassword = securityService.sanitizeInput(currentPassword);
  const sanitizedNewPassword = securityService.sanitizeInput(newPassword);
  const sanitizedOtp = securityService.sanitizeInput(otp);
  
  // Validate inputs for potential threats
  const validations = {
    currentPassword: securityService.validateInput(sanitizedCurrentPassword),
    newPassword: securityService.validateInput(sanitizedNewPassword),
    otp: securityService.validateInput(sanitizedOtp),
  };
  
  // Check for any validation failures
  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.valid) {
      console.warn(`Security threat detected in ${field}:`, validation.threats);
      throw new Error(`Invalid ${field} format detected`);
    }
  }
  
  const response = await api.post<{ message: string }>(ENDPOINTS.CHANGE_PASSWORD, { 
    current_password: sanitizedCurrentPassword,
    new_password: sanitizedNewPassword,
    otp: sanitizedOtp
  }, {
    requiresAuth: true
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
