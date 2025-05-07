/**
 * Settings API methods
 * Contains all API calls related to user and system settings
 */

import { api } from '@/lib/api-client';
import { getUserRole } from '@/lib/cookies';

// API endpoints
const ENDPOINTS = {
  SYSTEM_SETTINGS: '/settings',
  SYSTEM_SETTING: '/settings/:key',
  REGISTRATION_STATUS: '/registration/status',
  REGISTRATION_TOGGLE: '/registration/toggle',
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
 * Get a specific system setting by key
 * Admin/developer only endpoint
 */
export async function getSystemSetting(key: string) {
  const endpoint = ENDPOINTS.SYSTEM_SETTING.replace(':key', key);
  const response = await api.get<{ setting: SystemSetting }>(endpoint);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.setting;
}

/**
 * Update a system setting
 * Admin/developer only endpoint
 */
export async function updateSystemSetting(key: string, value: string | boolean | number) {
  const endpoint = ENDPOINTS.SYSTEM_SETTING.replace(':key', key);
  const response = await api.put<{ setting: SystemSetting }>(endpoint, { value });
  
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
