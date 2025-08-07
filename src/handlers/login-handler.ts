/**
 * Login handler
 * Contains the logic for handling user login
 */


// Import types
import { User } from '@/providers/auth-provider';
import * as loginApi from '@/app/auth/login/api';

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
    
    // Update state first
    setToken(data.token);
    setUser(data.user);
    setLastValidated(Date.now());
    
    // Check maintenance status
    const isMaintenanceActive = await loginApi.isInMaintenanceMode();
    console.log('Maintenance mode status:', isMaintenanceActive);
    
    // Determine if user can bypass maintenance mode
    const canBypassMaintenance = 
      data.user.is_admin === true || 
      (data.user.roles && (
        data.user.roles.includes('admin') || 
        data.user.roles.includes('developer')
      ));
    
    // Success notification handled by component
    
    // Redirect based on user role and maintenance status
    if (isMaintenanceActive && !canBypassMaintenance) {
      console.log('Redirecting to maintenance page');
      router.replace('/maintenance');
      // Maintenance notification handled by component
    } else {
      // Normal login flow - all users go to main dashboard
      console.log('Redirecting to dashboard, user:', data.user.username);
      router.replace('/dashboard');
    }
  } catch (error) {
    // Error notification handled by component
    throw error;
  } finally {
    setIsLoading(false);
  }
}
