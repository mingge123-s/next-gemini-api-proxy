/**
 * API request validation utilities
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      image_url: z.object({
        url: z.string(),
      }).optional(),
    })),
  ]),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional().default(1),
  max_tokens: z.number().min(1).optional(),
  top_p: z.number().min(0).max(1).optional().default(1),
  top_k: z.number().min(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional().default(0),
  presence_penalty: z.number().min(-2).max(2).optional().default(0),
  functions: z.array(z.any()).optional(),
  function_call: z.any().optional(),
  user: z.string().optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

/**
 * Validate chat completion request
 */
export function validateChatCompletionRequest(data: any): ChatCompletionRequest {
  try {
    return ChatCompletionRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid request: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  // Handle "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Validate API key (for password protection)
 */
export function validateApiKey(apiKey: string | null): boolean {
  const requiredPassword = process.env.PASSWORD;
  
  // If no password is set, allow all requests
  if (!requiredPassword) {
    return true;
  }
  
  // Check if provided API key matches the password
  return apiKey === requiredPassword;
}

/**
 * Get client IP address
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback for serverless environment
  return 'unknown';
}