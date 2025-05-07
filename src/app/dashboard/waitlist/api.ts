/**
 * Waitlist API methods
 * Contains all API calls related to waitlist management
 */

import { api } from '@/lib/api-client';

// Define waitlist entry type
export interface WaitlistEntry {
  id: number;
  email: string;
  name: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all waitlist entries
 */
export async function getWaitlistEntries() {
  // The backend returns entries in a nested structure: { entries: WaitlistEntry[] }
  const response = await api.get<{ entries: WaitlistEntry[] }>('/waitlist');
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Return the entries array from the response
  return response.data.entries;
}

/**
 * Update a waitlist entry
 */
export async function updateWaitlistEntry(id: number, data: { status: string; notes: string }) {
  const response = await api.put<{ success: boolean; message: string }>(`/waitlist/${id}`, data);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}

/**
 * Delete a waitlist entry
 */
export async function deleteWaitlistEntry(id: number) {
  const response = await api.delete<{ success: boolean; message: string }>(`/waitlist/${id}`);
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response.data;
}
