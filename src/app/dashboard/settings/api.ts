/**
 * Settings API methods
 * Contains all API calls related to user and system settings
 */

import { api } from '@/lib/api-client';
import securityService from '@/lib/security/security-service';

// API endpoints
const ENDPOINTS = {
  SYSTEM_SETTINGS: '/admin/settings',
  SYSTEM_SETTING: '/admin/settings/:key',
  REGISTRATION_STATUS: '/system/registration',
  REGISTRATION_TOGGLE: '/admin/system/registration/toggle',
  TEST_EMAIL: '/admin/email/test',
  CHANGE_PASSWORD: '/auth/change-password',
};

// Types
export interface SystemSetting {
  key: string;
  value: string | boolean | number;
  description?: string;
}

/**
 * Get all system settings
 * Admin/developer only endpoint
 */
export async function getAllSystemSettings() {
  const response = await api.get<{ settings: SystemSetting[] }>(ENDPOINTS.SYSTEM_SETTINGS);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.settings;
}

/**
 * Get a specific system setting by key with input sanitization
 * Admin/developer only endpoint
 */
export async function getSystemSetting(key: string) {
  // Sanitize key input to prevent path traversal attacks
  const sanitizedKey = securityService.sanitizeInput(key);
  const validation = securityService.validateInput(sanitizedKey);
  
  if (!validation.valid) {
    console.warn('Security threat detected in setting key:', validation.threats);
    throw new Error('Invalid setting key format detected');
  }
  
  const endpoint = ENDPOINTS.SYSTEM_SETTING.replace(':key', sanitizedKey);
  const response = await api.get<{ setting: SystemSetting }>(endpoint);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.setting;
}

/**
 * Update a system setting with input sanitization
 * Admin/developer only endpoint
 */
export async function updateSystemSetting(key: string, value: string | boolean | number) {
  // Sanitize key input to prevent path traversal attacks
  const sanitizedKey = securityService.sanitizeInput(key);
  const keyValidation = securityService.validateInput(sanitizedKey);
  
  if (!keyValidation.valid) {
    console.warn('Security threat detected in setting key:', keyValidation.threats);
    throw new Error('Invalid setting key format detected');
  }
  
  // Sanitize string values to prevent XSS attacks
  let sanitizedValue = value;
  if (typeof value === 'string') {
    sanitizedValue = securityService.sanitizeInput(value);
    const valueValidation = securityService.validateInput(sanitizedValue);
    
    if (!valueValidation.valid) {
      console.warn('Security threat detected in setting value:', valueValidation.threats);
      throw new Error('Invalid setting value format detected');
    }
  }
  
  const endpoint = ENDPOINTS.SYSTEM_SETTING.replace(':key', sanitizedKey);
  const response = await api.put<{ setting: SystemSetting }>(endpoint, { value: sanitizedValue });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.setting;
}

/**
 * Check if registration is enabled
 * Public endpoint
 */
export async function isRegistrationEnabled() {
  const response = await api.get<{ enabled: boolean }>(ENDPOINTS.REGISTRATION_STATUS, {
    requiresAuth: false
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.enabled;
}

/**
 * Toggle registration status
 * Admin/developer only endpoint
 */
export async function toggleRegistration(enabled: boolean) {
  // Backend expects a 'value' field with a string value
  const response = await api.put<{ registration_enabled: boolean }>(ENDPOINTS.REGISTRATION_TOGGLE, { 
    value: String(enabled) 
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.registration_enabled;
}

/**
 * Test email interface
 */
export interface TestEmailRequest {
  to: string;
  subject: string;
  message: string;
}

/**
 * Send a test email with input sanitization
 * Admin/developer only endpoint
 */
export async function sendTestEmail(request: TestEmailRequest) {
  // Sanitize all email input fields to prevent XSS attacks
  const sanitizedRequest: TestEmailRequest = {
    to: securityService.sanitizeInput(request.to),
    subject: securityService.sanitizeInput(request.subject),
    message: securityService.sanitizeInput(request.message),
  };
  
  // Validate all inputs for potential threats
  const validations = {
    to: securityService.validateInput(sanitizedRequest.to),
    subject: securityService.validateInput(sanitizedRequest.subject),
    message: securityService.validateInput(sanitizedRequest.message),
  };
  
  // Check for any validation failures
  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.valid) {
      console.warn(`Security threat detected in email ${field}:`, validation.threats);
      throw new Error(`Invalid email ${field} format detected`);
    }
  }
  
  const response = await api.post<{ message: string }>(ENDPOINTS.TEST_EMAIL, sanitizedRequest);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}

/**
 * Change password interface
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Change user password with input sanitization
 * Authenticated user endpoint
 */
export async function changePassword(request: ChangePasswordRequest) {
  // Sanitize password inputs to prevent XSS attacks
  const sanitizedRequest: ChangePasswordRequest = {
    currentPassword: securityService.sanitizeInput(request.currentPassword),
    newPassword: securityService.sanitizeInput(request.newPassword),
  };
  
  // Validate inputs for potential threats
  const currentPasswordValidation = securityService.validateInput(sanitizedRequest.currentPassword);
  const newPasswordValidation = securityService.validateInput(sanitizedRequest.newPassword);
  
  if (!currentPasswordValidation.valid) {
    console.warn('Security threat detected in current password:', currentPasswordValidation.threats);
    throw new Error('Invalid current password format detected');
  }
  
  if (!newPasswordValidation.valid) {
    console.warn('Security threat detected in new password:', newPasswordValidation.threats);
    throw new Error('Invalid new password format detected');
  }
  
  const response = await api.post<{ message: string }>(ENDPOINTS.CHANGE_PASSWORD, sanitizedRequest);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.message;
}
