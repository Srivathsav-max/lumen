/**
 * Register handler
 * Contains the logic for handling user registration
 */

import { toast } from 'sonner';
import { User, RegisterData } from '@/providers/auth-provider';
import * as registerApi from '@/app/auth/register/api';
// Using any type for router to avoid type issues

/**
 * Check if registration is enabled
 * @returns Boolean indicating if registration is enabled
 */
export async function isRegistrationEnabled(): Promise<boolean> {
  try {
    return await registerApi.isRegistrationEnabled();
  } catch (error) {
    console.error('Error checking registration status:', error);
    return false; // Default to disabled on error
  }
}

/**
 * Handle user registration
 * @param userData User registration data
 * @param setUser Function to update user state
 * @param setToken Function to update token state
 * @param setLastValidated Function to update last validated timestamp
 * @param setIsLoading Function to update loading state
 * @param router Next.js router instance
 */
export async function handleRegister(
  userData: RegisterData,
  setUser: (user: User | null) => void,
  setToken: (token: string | null) => void,
  setLastValidated: (timestamp: number) => void,
  setIsLoading: (isLoading: boolean) => void,
  router: any
) {
  try {
    setIsLoading(true);
    
    // Use register API module
    const data = await registerApi.register(userData);
    
    // Update state
    setToken(data.token);
    setUser(data.user);
    setLastValidated(Date.now());
    toast.success('Registration successful');
    
    // Redirect to user dashboard as new users will have free role
    setTimeout(() => {
      router.push('/dashboard/user');
    }, 300);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Registration failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
}
