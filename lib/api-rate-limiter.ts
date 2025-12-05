/**
 * 🛡️ API RATE LIMITER - v7.29.0
 * 
 * Enhanced rate limiting for API endpoints
 * Provides security against abuse and DDoS attempts
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for rate limiting
// Note: This resets on server restart in serverless environments
// For production, consider using Redis or Upstash
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configurations per endpoint type
export const API_RATE_LIMITS = {
  // Authentication endpoints
  AUTH: {
    maxRequests: 5,       // 5 attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  
  // Article creation endpoints
  ARTICLE_CREATE: {
    maxRequests: 10,      // 10 articles
    windowMs: 60 * 60 * 1000, // per hour
    message: 'Article creation rate limit exceeded. Please wait an hour.'
  },
  
  // General admin API
  ADMIN_API: {
    maxRequests: 100,     // 100 requests
    windowMs: 60 * 1000,  // per minute
    message: 'Admin API rate limit exceeded. Please slow down.'
  },
  
  // Public API (e.g., article views)
  PUBLIC_API: {
    maxRequests: 60,      // 60 requests
    windowMs: 60 * 1000,  // per minute
    message: 'Rate limit exceeded. Please try again later.'
  },
  
  // Image generation (expensive operation)
  IMAGE_GENERATE: {
    maxRequests: 5,       // 5 images
    windowMs: 60 * 60 * 1000, // per hour
    message: 'Image generation limit reached. Please wait an hour.'
  },
  
  // Translation API
  TRANSLATE: {
    maxRequests: 20,      // 20 translations
    windowMs: 60 * 60 * 1000, // per hour
    message: 'Translation limit reached. Please wait.'
  }
};

export type RateLimitType = keyof typeof API_RATE_LIMITS;

/**
 * Get client identifier from request
 * Uses IP address or fallback to a generic key
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  if (realIp) return realIp;
  
  // Fallback to a generic identifier
  return 'anonymous';
}

/**
 * Check if request is rate limited
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  request: NextRequest,
  limitType: RateLimitType,
  customKey?: string
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const config = API_RATE_LIMITS[limitType];
  const clientId = customKey || getClientIdentifier(request);
  const key = `${limitType}:${clientId}`;
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No entry or expired - allow and create new entry
  if (!entry || now >= entry.resetAt) {
    const newEntry = {
      count: 1,
      resetAt: now + config.windowMs
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter
    };
  }
  
  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Create rate limited response
 */
export function createRateLimitResponse(
  limitType: RateLimitType,
  result: { remaining: number; resetAt: number; retryAfter?: number }
): NextResponse {
  const config = API_RATE_LIMITS[limitType];
  
  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded',
      message: config.message,
      retryAfter: result.retryAfter
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        'Retry-After': result.retryAfter?.toString() || '60'
      }
    }
  );
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limitType: RateLimitType,
  result: { remaining: number; resetAt: number }
): NextResponse {
  const config = API_RATE_LIMITS[limitType];
  
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
  
  return response;
}

/**
 * Rate limit middleware wrapper
 * Use this to wrap API route handlers
 */
export function withRateLimit(
  limitType: RateLimitType,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = checkRateLimit(request, limitType);
    
    if (!result.allowed) {
      console.warn(`🚫 Rate limit exceeded for ${limitType}`, {
        ip: getClientIdentifier(request),
        retryAfter: result.retryAfter
      });
      return createRateLimitResponse(limitType, result);
    }
    
    const response = await handler(request);
    return addRateLimitHeaders(response, limitType, result);
  };
}

/**
 * Cleanup expired entries periodically
 * Call this in a cron job or during low-traffic periods
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupRateLimitStore();
    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000);
}

