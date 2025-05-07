import { NextRequest, NextResponse } from 'next/server';

export async function roleMiddleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;
  
  // Only apply middleware to dashboard routes
  if (!path.startsWith('/dashboard')) {
    return NextResponse.next();
  }
  
  // If no token, redirect to login
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Get user data from cookies
    const userData = request.cookies.get('auth_user')?.value;
    
    if (!userData) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const user = JSON.parse(userData);
    
    // Check if user has admin role
    const isAdmin = user.is_admin === true;
    const roles = user.roles || [];
    
    // Handle different dashboard routes based on roles
    if (path === '/dashboard') {
      // Main dashboard route - redirect based on role
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dashboard/user', request.url));
      }
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
    
    return NextResponse.next();
  } catch (error) {
    console.error('Error in role middleware:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
