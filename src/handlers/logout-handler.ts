/**
 * Logout handler
 * Contains the logic for handling user logout
 */

import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { clearAuthCookies } from '@/lib/cookies';
// Using any type for router to avoid type issues

/**
 * Handle user logout
 * @param setUser Function to update user state
 * @param setToken Function to update token state
 * @param setLastValidated Function to update last validated timestamp
 * @param router Next.js router instance
 */
export async function handleLogout(
  setUser: (user: null) => void,
  setToken: (token: null) => void,
  setLastValidated: (timestamp: number) => void,
  router: any
) {
  try {
    // Call server-side logout endpoint to clear HTTP-only cookies
    await api.post('/auth/logout', {});
    
    // Clear client-side cookies
    clearAuthCookies();
    
    // Clear permanent token from localStorage
    localStorage.removeItem('permanent_token');
    localStorage.removeItem('token_expires_at');
    
    // Update state
    setToken(null);
    setUser(null);
    setLastValidated(0);
    toast.success('Logged out successfully');
    
    // Use router instead of window.location for better Next.js integration
    router.push('/auth/login');
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Still clear client-side cookies and state on error
    clearAuthCookies();
    localStorage.removeItem('permanent_token');
    localStorage.removeItem('token_expires_at');
    setToken(null);
    setUser(null);
    setLastValidated(0);
    
    toast.error('Error during logout. Please try again.');
    
    // Redirect anyway
    router.push('/auth/login');
  }
}
