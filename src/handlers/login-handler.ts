/**
 * Login handler
 * Contains the logic for handling user login
 */


// Import types
import { User } from '@/providers/auth-provider';
import * as loginApi from '@/app/auth/login/api';
import { toast } from 'sonner';

/**
 * Handle user login
 * @param email User email
 * @param password User password
 * @param setUser Function to update user state
 * @param setToken Function to update token state
 * @param setLastValidated Function to update last validated timestamp
 * @param setIsLoading Function to update loading state
 * @param router Next.js router instance
 */
export async function handleLogin(
  email: string, 
  password: string,
  setUser: (user: User | null) => void,
  setToken: (token: string | null) => void,
  setLastValidated: (timestamp: number) => void,
  setIsLoading: (isLoading: boolean) => void,
  router: any
) {
  try {
    setIsLoading(true);
    
    // Use login API module
    const data = await loginApi.login(email, password);
    
    // Log the data for debugging
    console.log('Login handler - login data:', data);
    
    // Update state
    setToken(data.token);
    setUser(data.user);
    setLastValidated(Date.now());
    toast.success('Login successful');
    
    // Check maintenance status
    const isMaintenanceActive = await loginApi.isInMaintenanceMode();
    
    // Determine if user can bypass maintenance mode
    const canBypassMaintenance = 
      data.user.is_admin === true || 
      (data.user.roles && (
        data.user.roles.includes('admin') || 
        data.user.roles.includes('developer')
      ));
    
    // Redirect based on user role and maintenance status
    setTimeout(() => {
      // If maintenance is active and user cannot bypass, redirect to maintenance page
      if (isMaintenanceActive && !canBypassMaintenance) {
        router.push('/maintenance');
        toast.info('System is currently in maintenance mode. Only administrators can access the dashboard.');
      } else {
        // Normal login flow - redirect based on user role
        if (data.user.is_admin) {
          router.push('/dashboard');
        } else {
          router.push('/dashboard/user');
        }
      }
    }, 300);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Login failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
}
