/**
 * Admin API endpoint to get system status
 * GET /api/admin/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractApiKey, validateApiKey } from '@/lib/api/validation';
import { geminiKeyManager } from '@/lib/gemini/key-manager';
import { rateLimiter } from '@/lib/api/rate-limiter';
import { concurrentCacheManager } from '@/lib/api/concurrent-cache';
import { disguiseManager } from '@/lib/api/disguise';

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const apiKey = extractApiKey(request);
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Collect system status
    const keyStats = geminiKeyManager.getKeyStats();
    const rateLimitStats = rateLimiter.getStats();
    const cacheStats = concurrentCacheManager.getCacheStats();
    const disguiseStats = disguiseManager.getStats();

    const systemStatus = {
      timestamp: new Date().toISOString(),
      apiKeys: keyStats,
      rateLimit: rateLimitStats,
      cache: cacheStats,
      disguise: disguiseStats,
      environment: {
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30'),
        maxRequestsPerDayPerIP: parseInt(process.env.MAX_REQUESTS_PER_DAY_PER_IP || '600'),
        enableFakeStreaming: process.env.ENABLE_FAKE_STREAMING === 'true',
        enableConcurrentRequests: process.env.ENABLE_CONCURRENT_REQUESTS === 'true',
        concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '1'),
        enableDisguiseInfo: process.env.ENABLE_DISGUISE_INFO === 'true',
        enableSearchMode: process.env.ENABLE_SEARCH_MODE === 'true',
        enableCache: process.env.ENABLE_CACHE === 'true',
      },
    };

    return NextResponse.json(systemStatus, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in /api/admin/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}