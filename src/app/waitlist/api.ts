/**
 * Waitlist API methods
 * Contains all API calls related to waitlist functionality
 */

import { api } from '@/lib/api-client';

// API endpoints
const ENDPOINTS = {
  WAITLIST: '/waitlist',
};

// Types
export interface WaitlistEntry {
  email: string;
  name?: string;
}

/**
 * Join the waitlist with email and optional name
 * Public endpoint that doesn't require authentication
 */
export async function joinWaitlist(data: WaitlistEntry) {
  const response = await api.post<{ success: boolean; message: string }>(
    ENDPOINTS.WAITLIST, 
    data,
    { requiresAuth: false }
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Get waitlist statistics (admin only)
 */
export async function getWaitlistStats() {
  const response = await api.get<{ 
    total: number; 
    recent: number;
    conversion_rate: number;
  }>(ENDPOINTS.WAITLIST + '/stats');
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Export waitlist entries (admin only)
 */
export async function exportWaitlist() {
  const response = await api.get<{ entries: WaitlistEntry[] }>(
    ENDPOINTS.WAITLIST + '/export'
  );
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data.entries;
}
