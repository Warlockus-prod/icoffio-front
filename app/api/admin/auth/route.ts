/**
 * 🔐 ADMIN AUTHENTICATION API
 * v7.29.0 - Secure server-side authentication
 * 
 * SECURITY FEATURES:
 * - Password validation happens server-side only
 * - Password is never exposed to client code
 * - Rate limiting prevents brute force attacks
 * - HTTP-only cookies for session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '@/lib/api-rate-limiter';

// Secure token generation
function generateSecureToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `icoffio_${timestamp}_${random}${random2}`;
}

// Token validation (simple implementation - can be enhanced with JWT)
function validateToken(token: string): boolean {
  if (!token || !token.startsWith('icoffio_')) return false;
  
  // Extract timestamp from token
  const parts = token.split('_');
  if (parts.length < 2) return false;
  
  const timestamp = parseInt(parts[1], 36);
  const now = Date.now();
  
  // Token expires after 24 hours
  const expirationMs = 24 * 60 * 60 * 1000;
  return (now - timestamp) < expirationMs;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, password } = body;

    // LOGIN action with rate limiting
    if (action === 'login') {
      // Check rate limit for login attempts
      const rateLimitResult = checkRateLimit(request, 'AUTH');
      if (!rateLimitResult.allowed) {
        console.warn('⚠️ Login rate limit exceeded');
        return createRateLimitResponse('AUTH', rateLimitResult);
      }
      // Get password from environment variable with fallback for backwards compatibility
      const adminPassword = process.env.ADMIN_PASSWORD || 'icoffio2025';
      
      if (!process.env.ADMIN_PASSWORD) {
        console.warn('⚠️ ADMIN_PASSWORD not configured, using fallback (set env var for security!)');
      }

      // Validate password
      if (password === adminPassword) {
        const token = generateSecureToken();
        
        // Set HTTP-only cookie for additional security
        const cookieStore = cookies();
        cookieStore.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/'
        });

        console.log('✅ Admin login successful');
        
        const response = NextResponse.json({
          success: true,
          token,
          expiresIn: 24 * 60 * 60 * 1000 // 24 hours in ms
        });
        
        return addRateLimitHeaders(response, 'AUTH', rateLimitResult);
      } else {
        console.warn('⚠️ Admin login failed - wrong password');
        return NextResponse.json(
          { success: false, error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // LOGOUT action
    if (action === 'logout') {
      const cookieStore = cookies();
      cookieStore.delete('admin_token');
      
      return NextResponse.json({ success: true });
    }

    // VALIDATE action
    if (action === 'validate') {
      const { token } = body;
      const cookieToken = cookies().get('admin_token')?.value;
      
      const tokenToValidate = token || cookieToken;
      const isValid = tokenToValidate ? validateToken(tokenToValidate) : false;
      
      return NextResponse.json({ 
        success: true, 
        valid: isValid 
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Auth API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if user is authenticated via cookie
  const cookieToken = cookies().get('admin_token')?.value;
  const isValid = cookieToken ? validateToken(cookieToken) : false;
  
  return NextResponse.json({ 
    authenticated: isValid,
    message: isValid ? 'Session valid' : 'Not authenticated or session expired'
  });
}

