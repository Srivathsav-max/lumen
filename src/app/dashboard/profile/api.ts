/**
 * Profile API methods
 * Contains all API calls related to user profile management
 */

import { api } from '@/lib/api-client';
import { User } from '@/providers/auth-provider';
import { getUserData, setUserData } from '@/lib/cookies';

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
 * Update the user's profile information
 */
export async function updateUserProfile(userData: Partial<User>) {
  const response = await api.put<{ data: { user: User } } | { user: User }>(ENDPOINTS.PROFILE, userData);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Handle nested data structure
  const responseData = 'data' in response.data ? response.data.data : response.data;
  const user = responseData.user;
  
  // Update user data in cookies
  const currentUser = getUserData();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...userData };
    setUserData(updatedUser);
  }
  
  return user;
}

/**
 * Change the user's password
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await api.put(ENDPOINTS.CHANGE_PASSWORD, {
    current_password: currentPassword,
    new_password: newPassword,
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
