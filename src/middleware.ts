import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { roleMiddleware } from './middleware/role-middleware';

export async function middleware(request: NextRequest) {
  // Apply role-based access control middleware
  return roleMiddleware(request);
}

// Configure the paths that should be checked by this middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};
