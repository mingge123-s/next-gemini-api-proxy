/**
 * OpenAI compatible chat completions endpoint
 * POST /api/v1/chat/completions
 */

import { NextRequest, NextResponse } from 'next/server';
import { geminiClient } from '@/lib/gemini/client';
import { validateChatCompletionRequest, extractApiKey, validateApiKey, getClientIP } from '@/lib/api/validation';
import { rateLimiter } from '@/lib/api/rate-limiter';
import { fakeStreamingManager } from '@/lib/api/fake-streaming';
import { concurrentCacheManager } from '@/lib/api/concurrent-cache';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limits
    const rateLimitResult = rateLimiter.checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: {
            message: rateLimitResult.error,
            type: 'rate_limit_exceeded',
            code: 'rate_limit_exceeded',
          },
        },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Extract and validate API key (password protection)
    const apiKey = extractApiKey(request);
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid API key provided',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = validateChatCompletionRequest(body);

    // Handle streaming vs non-streaming
    if (validatedRequest.stream) {
      // Check if fake streaming is enabled
      const enableFakeStreaming = process.env.ENABLE_FAKE_STREAMING === 'true';
      
      // Return streaming response
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (enableFakeStreaming) {
              // Use fake streaming
              await fakeStreamingManager.handleFakeStreaming(validatedRequest, controller);
            } else {
              // Use real streaming
              const responseStream = geminiClient.chatCompletionStream(validatedRequest);
              
              for await (const chunk of responseStream) {
                controller.enqueue(encoder.encode(chunk));
              }
            }
            
          } catch (error) {
            console.error('Streaming error:', error);
            const errorChunk = {
              error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'server_error',
                code: 'internal_error',
              },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else {
      // Return non-streaming response
      // Use concurrent cache manager for non-streaming requests
      const response = await concurrentCacheManager.handleRequest(validatedRequest);
      
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

  } catch (error) {
    console.error('Error in /api/v1/chat/completions:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorType = 'server_error';
    let errorCode = 'internal_error';
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      if (error.message.includes('Invalid request')) {
        statusCode = 400;
        errorType = 'invalid_request_error';
        errorCode = 'invalid_request';
        errorMessage = error.message;
      } else if (error.message.includes('No valid')) {
        statusCode = 503;
        errorType = 'service_unavailable';
        errorCode = 'service_unavailable';
        errorMessage = 'Gemini API service temporarily unavailable';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: {
          message: errorMessage,
          type: errorType,
          code: errorCode,
        },
      },
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
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
      'Access-Control-Max-Age': '86400',
    },
  });
}