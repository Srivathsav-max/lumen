import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Cookie names for consistency with client-side
const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN: 'csrf_token',
  USER_DATA: 'user_data',
  PERMANENT_TOKEN: 'permanent_token',
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/waitlist',
  '/maintenance',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_REDIRECT_ROUTES = [
  '/auth/login',
  '/auth/register',
];

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get(COOKIE_NAMES.AUTH_TOKEN)?.value;
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  console.log('Middleware - Path:', path);
  console.log('Middleware - Auth token:', authToken ? 'exists' : 'missing');
  
  // Handle authentication redirects for login/register pages
  if (AUTH_REDIRECT_ROUTES.includes(path) && authToken) {
    console.log('Middleware - User is authenticated, redirecting from auth page to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    console.log('Middleware - Public route, skipping auth check');
    return NextResponse.next();
  }
  
  // Skip middleware for API routes (handled by backend auth)
  if (path.startsWith('/api/')) {
    console.log('Middleware - API route, skipping auth check');
    return NextResponse.next();
  }
  
  // If no token and not a public route, redirect to login
  if (!authToken) {
    console.log('Middleware - No auth token, redirecting to /auth/login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Generate CSRF token if it doesn't exist (for non-GET requests)
  let response = NextResponse.next();
  
  if (!request.cookies.get(COOKIE_NAMES.CSRF_TOKEN) && method !== 'GET') {
    const csrfToken = uuidv4();
    
    // Set CSRF token cookie (not HTTP-only so JS can read it)
    response.cookies.set(COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
  
  // Handle dashboard routes based on user roles
  if (path.startsWith('/dashboard')) {
    try {
      // Get user data from cookies
      const userData = request.cookies.get(COOKIE_NAMES.USER_DATA)?.value;
      console.log('Middleware - User data cookie:', userData ? 'exists' : 'missing');
      
      if (!userData) {
        console.log('Middleware - No user data, redirecting to login');
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
      
      let user;
      try {
        user = JSON.parse(userData);
        console.log('Middleware - Parsed user data:', user);
      } catch (e) {
        console.error('Middleware - Failed to parse user data:', e);
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
      
      // Check if user has admin role
      const isAdmin = user.is_admin === true;
      const roles = user.roles || [];
      const canBypassMaintenance = isAdmin || roles.includes('admin') || roles.includes('developer');
      console.log('Middleware - User roles:', roles, 'isAdmin:', isAdmin, 'canBypassMaintenance:', canBypassMaintenance);
      
      // Check maintenance mode status
      try {
        // Make a server-side request to check maintenance status
        const maintenanceResponse = await fetch(new URL('/api/maintenance/status', request.url).toString());
        const maintenanceData = await maintenanceResponse.json();
        
        if (maintenanceData.maintenance_enabled && !canBypassMaintenance) {
          console.log('Middleware - System in maintenance mode, redirecting non-admin user to maintenance page');
          return NextResponse.redirect(new URL('/maintenance', request.url));
        }
      } catch (error) {
        console.error('Middleware - Error checking maintenance status:', error);
        // Continue if we can't check maintenance status
      }
      
      // Handle different dashboard routes based on roles
      if (path === '/dashboard') {
        // Main dashboard route - redirect based on role
        if (!isAdmin) {
          console.log('Middleware - Redirecting non-admin from /dashboard to /dashboard/user');
          return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
        
        console.log('Middleware - Admin accessing /dashboard, allowing access');
        // Return the response with any cookies we set
        return response;
      } else if (path === '/dashboard/admin' || path.startsWith('/dashboard/admin/')) {
        // Admin routes - only accessible to admins
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
      } else if (path === '/dashboard/user' || path.startsWith('/dashboard/user/')) {
        // User routes - accessible to all authenticated users
        // No redirect needed
      } else if (path === '/dashboard/student' || path.startsWith('/dashboard/student/')) {
        // Student routes - only accessible to users with student role
        if (!roles.includes('student') && !isAdmin) {
          return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
      } else if (path === '/dashboard/teacher' || path.startsWith('/dashboard/teacher/')) {
        // Teacher routes - only accessible to users with teacher role
        if (!roles.includes('teacher') && !isAdmin) {
          return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
      } else if (path === '/dashboard/organization' || path.startsWith('/dashboard/organization/')) {
        // Organization routes - only accessible to users with organization role
        if (!roles.includes('organization') && !isAdmin) {
          return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in middleware:', error);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }
  
  return response;
}

// Configure the paths that should be checked by this middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.png$).*)',
  ],
};
