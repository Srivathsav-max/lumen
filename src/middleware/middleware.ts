import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Cookie names for consistency with client-side
const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
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
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  console.log('Middleware - Path:', path);
  console.log('Middleware - Access token:', accessToken ? 'exists' : 'missing');
  
  // Handle authentication redirects for login/register pages
  if (AUTH_REDIRECT_ROUTES.includes(path) && accessToken) {
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
  if (!accessToken) {
    console.log('Middleware - No access token, redirecting to /auth/login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Simplified response (no CSRF token generation in middleware)
  let response = NextResponse.next();
  
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
      
      // Removed API call for maintenance check - will be handled client-side
      
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
