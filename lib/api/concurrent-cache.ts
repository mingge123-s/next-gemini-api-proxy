/**
 * Concurrent requests and caching functionality
 */

import NodeCache from 'node-cache';
import crypto from 'crypto';
import { geminiClient, GeminiChatRequest, GeminiChatResponse } from '@/lib/gemini/client';

interface CachedResponse {
  response: GeminiChatResponse;
  timestamp: number;
  requestHash: string;
}

class ConcurrentCacheManager {
  private cache: NodeCache;
  private defaultTTL: number = 3600; // 1 hour
  private concurrentRequests: number;
  private enableConcurrent: boolean;
  private enableCache: boolean;

  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: this.defaultTTL,
      checkperiod: 300, // Check for expired keys every 5 minutes
    });
    
    this.concurrentRequests = parseInt(process.env.CONCURRENT_REQUESTS || '1');
    this.enableConcurrent = process.env.ENABLE_CONCURRENT_REQUESTS === 'true' && this.concurrentRequests > 1;
    this.enableCache = process.env.ENABLE_CACHE === 'true';
    
    console.log(`Concurrent cache manager initialized - Concurrent: ${this.enableConcurrent} (${this.concurrentRequests}), Cache: ${this.enableCache}`);
  }

  /**
   * Generate cache key for a request
   */
  private generateCacheKey(request: GeminiChatRequest): string {
    // Create a hash of the request content
    const requestString = JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      top_k: request.top_k,
    });
    
    return crypto.createHash('sha256').update(requestString).digest('hex');
  }

  /**
   * Get cached response if available
   */
  private getCachedResponse(cacheKey: string): GeminiChatResponse | null {
    if (!this.enableCache) return null;
    
    const cached = this.cache.get<CachedResponse>(cacheKey);
    if (cached) {
      console.log(`Cache hit for key: ${cacheKey.substring(0, 8)}...`);
      return cached.response;
    }
    
    return null;
  }

  /**
   * Cache a response
   */
  private setCachedResponse(cacheKey: string, response: GeminiChatResponse) {
    if (!this.enableCache) return;
    
    const cachedResponse: CachedResponse = {
      response,
      timestamp: Date.now(),
      requestHash: cacheKey,
    };
    
    this.cache.set(cacheKey, cachedResponse);
    console.log(`Cached response for key: ${cacheKey.substring(0, 8)}...`);
  }

  /**
   * Handle request with concurrent processing and caching
   */
  async handleRequest(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = this.getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    // If concurrent requests are disabled or set to 1, use normal processing
    if (!this.enableConcurrent || this.concurrentRequests <= 1) {
      const response = await geminiClient.chatCompletion(request);
      this.setCachedResponse(cacheKey, response);
      return response;
    }

    // Handle concurrent requests
    return this.handleConcurrentRequests(request, cacheKey);
  }

  /**
   * Handle multiple concurrent requests
   */
  private async handleConcurrentRequests(request: GeminiChatRequest, cacheKey: string): Promise<GeminiChatResponse> {
    const promises: Promise<GeminiChatResponse>[] = [];
    
    // Create multiple concurrent requests
    for (let i = 0; i < this.concurrentRequests; i++) {
      promises.push(geminiClient.chatCompletion(request));
    }

    try {
      // Wait for first successful response
      const response = await Promise.any(promises);
      
      // Cache the response
      this.setCachedResponse(cacheKey, response);
      
      // Handle additional successful responses for caching
      this.handleAdditionalResponses(promises, response, cacheKey);
      
      return response;
      
    } catch (error) {
      // If all concurrent requests fail, throw the error
      console.error('All concurrent requests failed:', error);
      throw error;
    }
  }

  /**
   * Handle additional successful responses from concurrent requests
   */
  private async handleAdditionalResponses(
    promises: Promise<GeminiChatResponse>[],
    firstResponse: GeminiChatResponse,
    baseCacheKey: string
  ) {
    try {
      // Wait for all promises to settle
      const results = await Promise.allSettled(promises);
      
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.id !== firstResponse.id) {
          successCount++;
          
          // Cache additional successful responses with variation suffix
          const variantCacheKey = `${baseCacheKey}_variant_${successCount}`;
          this.setCachedResponse(variantCacheKey, result.value);
        }
      });
      
      if (successCount > 0) {
        console.log(`Cached ${successCount} additional responses from concurrent requests`);
      }
      
    } catch (error) {
      console.warn('Error handling additional concurrent responses:', error);
      // Don't throw here - the main response was already successful
    }
  }

  /**
   * Get a random cached response for regeneration
   */
  getRandomCachedResponse(cacheKey: string): GeminiChatResponse | null {
    if (!this.enableCache) return null;

    // Look for the main cached response
    const mainResponse = this.getCachedResponse(cacheKey);
    if (mainResponse) return mainResponse;

    // Look for variant responses
    const keys = this.cache.keys();
    const variantKeys = keys.filter(key => key.startsWith(cacheKey + '_variant_'));
    
    if (variantKeys.length > 0) {
      const randomKey = variantKeys[Math.floor(Math.random() * variantKeys.length)];
      const cached = this.cache.get<CachedResponse>(randomKey);
      
      if (cached) {
        console.log(`Using cached variant response: ${randomKey.substring(0, 16)}...`);
        return cached.response;
      }
    }

    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const keys = this.cache.keys();
    const stats = this.cache.getStats();
    
    return {
      totalKeys: keys.length,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      variantKeys: keys.filter(key => key.includes('_variant_')).length,
      settings: {
        concurrentRequests: this.concurrentRequests,
        enableConcurrent: this.enableConcurrent,
        enableCache: this.enableCache,
      },
    };
  }

  /**
   * Remove expired cache entries
   */
  pruneCache() {
    const keys = this.cache.keys();
    let prunedCount = 0;
    
    keys.forEach(key => {
      const cached = this.cache.get<CachedResponse>(key);
      if (!cached) {
        prunedCount++;
      }
    });
    
    console.log(`Pruned ${prunedCount} expired cache entries`);
    return prunedCount;
  }
}

export const concurrentCacheManager = new ConcurrentCacheManager();