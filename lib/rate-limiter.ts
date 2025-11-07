/**
 * RATE LIMITER
 * 
 * Simple in-memory rate limiter to reduce API calls
 * Prevents excessive function invocations
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if action is allowed
   */
  isAllowed(
    key: string, 
    maxRequests: number, 
    windowMs: number
  ): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No entry or expired - allow
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return false;
    }

    // Increment and allow
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(
    key: string, 
    maxRequests: number
  ): number {
    const entry = this.limits.get(key);
    if (!entry) return maxRequests;
    
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all limits
   */
  clear() {
    this.limits.clear();
  }

  /**
   * Destroy rate limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

// Common rate limit configs
export const RateLimits = {
  // Article views: 1 track per IP per article per hour
  ARTICLE_VIEW: {
    maxRequests: 1,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Telegram bot: 10 requests per user per minute
  TELEGRAM_USER: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Image generation: 3 per user per hour
  IMAGE_GENERATION: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // AI copywriting: 5 per user per hour
  AI_COPYWRITING: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};








