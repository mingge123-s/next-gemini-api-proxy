/**
 * Rate limiting utilities
 */

import NodeCache from 'node-cache';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private cache: NodeCache;
  private maxRequestsPerMinute: number;
  private maxRequestsPerDayPerIP: number;

  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: 86400, // 24 hours
      checkperiod: 120, // Check for expired keys every 2 minutes
    });
    
    this.maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30');
    this.maxRequestsPerDayPerIP = parseInt(process.env.MAX_REQUESTS_PER_DAY_PER_IP || '600');
  }

  /**
   * Check if request is within rate limits
   */
  public checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number; error?: string } {
    const now = Date.now();
    
    // Check per-minute limit (global)
    const minuteKey = `minute:${Math.floor(now / 60000)}`;
    const minuteData = this.cache.get<RateLimitInfo>(minuteKey) || { count: 0, resetTime: Math.floor(now / 60000) * 60000 + 60000 };
    
    if (minuteData.count >= this.maxRequestsPerMinute) {
      const retryAfter = Math.ceil((minuteData.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        error: `Rate limit exceeded: ${this.maxRequestsPerMinute} requests per minute`,
      };
    }

    // Check per-day limit (per IP)
    const dayKey = `day:${ip}:${Math.floor(now / 86400000)}`;
    const dayData = this.cache.get<RateLimitInfo>(dayKey) || { count: 0, resetTime: Math.floor(now / 86400000) * 86400000 + 86400000 };
    
    if (dayData.count >= this.maxRequestsPerDayPerIP) {
      const retryAfter = Math.ceil((dayData.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        error: `Rate limit exceeded: ${this.maxRequestsPerDayPerIP} requests per day per IP`,
      };
    }

    // Update counters
    minuteData.count++;
    dayData.count++;
    
    this.cache.set(minuteKey, minuteData, 60); // 1 minute TTL
    this.cache.set(dayKey, dayData, 86400); // 24 hours TTL
    
    return { allowed: true };
  }

  /**
   * Get current rate limit status for an IP
   */
  public getRateLimitStatus(ip: string) {
    const now = Date.now();
    
    // Minute stats
    const minuteKey = `minute:${Math.floor(now / 60000)}`;
    const minuteData = this.cache.get<RateLimitInfo>(minuteKey) || { count: 0, resetTime: 0 };
    
    // Day stats
    const dayKey = `day:${ip}:${Math.floor(now / 86400000)}`;
    const dayData = this.cache.get<RateLimitInfo>(dayKey) || { count: 0, resetTime: 0 };
    
    return {
      perMinute: {
        current: minuteData.count,
        limit: this.maxRequestsPerMinute,
        resetTime: minuteData.resetTime,
      },
      perDay: {
        current: dayData.count,
        limit: this.maxRequestsPerDayPerIP,
        resetTime: dayData.resetTime,
      },
    };
  }

  /**
   * Reset rate limits (for testing or admin purposes)
   */
  public resetRateLimits(ip?: string) {
    if (ip) {
      // Reset for specific IP
      const keys = this.cache.keys().filter(key => key.includes(ip));
      keys.forEach(key => this.cache.del(key));
    } else {
      // Reset all
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const keys = this.cache.keys();
    const stats = {
      totalKeys: keys.length,
      minuteKeys: keys.filter(k => k.startsWith('minute:')).length,
      dayKeys: keys.filter(k => k.startsWith('day:')).length,
      cacheHits: this.cache.getStats().hits,
      cacheMisses: this.cache.getStats().misses,
    };
    
    return stats;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();