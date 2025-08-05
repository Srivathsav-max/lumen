/**
 * Waitlist API methods
 * Contains all API calls related to waitlist management
 */

import { api } from '@/lib/api-client';

// Define waitlist entry type (backend response)
interface WaitlistEntryResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  reason: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// Define waitlist entry type (frontend)
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
  // The backend returns entries in a nested structure: { data: { entries: WaitlistEntryResponse[] } }
  const response = await api.get<{ data: { entries: WaitlistEntryResponse[] } }>('/waitlist');
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Map backend response to frontend format
  const backendEntries = response.data.data.entries;
  return backendEntries.map((entry: WaitlistEntryResponse): WaitlistEntry => ({
    id: entry.id,
    email: entry.email,
    name: `${entry.first_name} ${entry.last_name}`.trim() || 'N/A',
    status: entry.status,
    notes: entry.reason || '',
    created_at: entry.created_at,
    updated_at: entry.updated_at
  }));
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
