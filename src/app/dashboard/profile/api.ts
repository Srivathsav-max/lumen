/**
 * Profile API methods
 * Contains all API calls related to user profile management
 */

import { api } from '@/lib/api-client';
import { User } from '@/providers/auth-provider';
import { getUserData, setUserData } from '@/lib/cookies';
import securityService from '@/lib/security/security-service';

// API endpoints
const ENDPOINTS = {
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/profile/password',
  CONNECTED_ACCOUNTS: '/profile/connected-accounts',
  TWO_FACTOR: '/profile/2fa',
};

/**
 * Get the current user's profile
 */
export async function getUserProfile() {
  const response = await api.get<{ data: { user: User } } | { user: User }>(ENDPOINTS.PROFILE);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle nested data structure
  const responseData = 'data' in response.data ? response.data.data : response.data;
  return responseData.user;
}

/**
 * Update the user's profile information with input sanitization
 */
export async function updateUserProfile(userData: Partial<User>) {
  // Sanitize all string inputs to prevent XSS attacks
  const sanitizedUserData: Partial<User> = {};
  
  if (userData.username !== undefined) {
    sanitizedUserData.username = securityService.sanitizeInput(userData.username);
  }
  if (userData.email !== undefined) {
    sanitizedUserData.email = securityService.sanitizeInput(userData.email);
  }
  if (userData.first_name !== undefined) {
    sanitizedUserData.first_name = securityService.sanitizeInput(userData.first_name);
  }
  if (userData.last_name !== undefined) {
    sanitizedUserData.last_name = securityService.sanitizeInput(userData.last_name);
  }
  
  // Copy non-string fields as-is
  if (userData.id !== undefined) sanitizedUserData.id = userData.id;
  if (userData.roles !== undefined) sanitizedUserData.roles = userData.roles;
  if (userData.is_admin !== undefined) sanitizedUserData.is_admin = userData.is_admin;
  
  // Validate all sanitized inputs
  const stringFields = ['username', 'email', 'first_name', 'last_name'] as const;
  for (const field of stringFields) {
    if (sanitizedUserData[field] !== undefined) {
      const validation = securityService.validateInput(sanitizedUserData[field] as string);
      if (!validation.valid) {
        console.warn(`Security threat detected in ${field}:`, validation.threats);
        throw new Error(`Invalid ${field} format detected`);
      }
    }
  }
  
  const response = await api.put<{ data: { user: User } } | { user: User }>(ENDPOINTS.PROFILE, sanitizedUserData, {
    skipAuthRedirect: true // Prevent automatic logout on profile update errors
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle nested data structure
  const responseData = 'data' in response.data ? response.data.data : response.data;
  const user = responseData.user;
  
  // Update user data in cookies
  const currentUser = getUserData();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...sanitizedUserData };
    setUserData(updatedUser);
  }
  
  return user;
}

/**
 * Change the user's password with input sanitization
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  // Sanitize password inputs to prevent XSS attacks
  const sanitizedCurrentPassword = securityService.sanitizeInput(currentPassword);
  const sanitizedNewPassword = securityService.sanitizeInput(newPassword);
  
  // Validate inputs for potential threats
  const currentPasswordValidation = securityService.validateInput(sanitizedCurrentPassword);
  const newPasswordValidation = securityService.validateInput(sanitizedNewPassword);
  
  if (!currentPasswordValidation.valid) {
    console.warn('Security threat detected in current password:', currentPasswordValidation.threats);
    throw new Error('Invalid current password format detected');
  }
  
  if (!newPasswordValidation.valid) {
    console.warn('Security threat detected in new password:', newPasswordValidation.threats);
    throw new Error('Invalid new password format detected');
  }
  
  const response = await api.put(ENDPOINTS.CHANGE_PASSWORD, {
    current_password: sanitizedCurrentPassword,
    new_password: sanitizedNewPassword,
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Get connected accounts for the user
 */
export async function getConnectedAccounts() {
  const response = await api.get(ENDPOINTS.CONNECTED_ACCOUNTS);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Enable or configure two-factor authentication
 */
export async function configureTwoFactor(enable: boolean, options?: any) {
  const response = await api.post(ENDPOINTS.TWO_FACTOR, {
    enable,
    ...options,
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}
