/**
 * Profile handler
 * Contains the logic for handling user profile updates
 */

import { toast } from '@/providers/notification-provider';
import { User } from '@/providers/auth-provider';
import * as profileApi from '@/app/dashboard/profile/api';
import { setUserData } from '@/lib/cookies';

/**
 * Handle user profile update
 * @param userData Partial user data to update
 * @param user Current user state
 * @param token Current token state
 * @param setUser Function to update user state
 * @param setIsLoading Function to update loading state
 * @returns Updated user data or undefined if update fails
 */
export async function handleUpdateProfile(
  userData: Partial<User>,
  user: User | null,
  token: string | null,
  setUser: (user: User) => void,
  setIsLoading: (isLoading: boolean) => void
): Promise<User | undefined> {
  if (!token || !user) {
    toast.error('You must be logged in to update your profile');
    return;
  }
  
  try {
    setIsLoading(true);
    
    // Use profile API module
    const updatedUser = await profileApi.updateUserProfile(userData);
    
    // Update user data in state
    setUser(updatedUser);
    
    // Update user data in cookies
    setUserData(updatedUser);
    
    toast.success('Profile updated successfully');
    return updatedUser;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Profile update failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
}
