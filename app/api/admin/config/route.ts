/**
 * Admin API endpoint to manage system configuration
 * POST /api/admin/config - Update system configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractApiKey, validateApiKey } from '@/lib/api/validation';
import { z } from 'zod';

const configSchema = z.object({
  maxRequestsPerMinute: z.number().min(1).max(1000),
  maxRequestsPerDayPerIP: z.number().min(1).max(100000),
  enableFakeStreaming: z.boolean(),
  enableConcurrentRequests: z.boolean(),
  concurrentRequests: z.number().min(1).max(10),
  enableDisguiseInfo: z.boolean(),
  enableSearchMode: z.boolean(),
  enableCache: z.boolean(),
  maxRetries: z.number().min(1).max(10).optional(),
  retryDelay: z.number().min(100).max(10000).optional(),
  requestTimeout: z.number().min(5000).max(60000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const apiKey = extractApiKey(request);
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate configuration data
    const validatedConfig = configSchema.parse(body);
    
    // Here you would typically save the configuration to a database or file
    // For now, we'll just simulate a successful save
    console.log('Configuration updated:', validatedConfig);
    
    // In a real implementation, you might want to:
    // 1. Save to database
    // 2. Update environment variables
    // 3. Restart services if needed
    // 4. Validate that changes are safe
    
    return NextResponse.json(
      { 
        message: '配置保存成功',
        config: validatedConfig 
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in POST /api/admin/config:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: '配置数据验证失败',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '保存配置失败' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}