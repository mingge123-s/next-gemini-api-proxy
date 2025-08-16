/**
 * OpenAI compatible models endpoint
 * GET /api/v1/models
 */

import { NextRequest, NextResponse } from 'next/server';
import { OPENAI_COMPATIBLE_MODELS } from '@/lib/gemini/config';

export async function GET(request: NextRequest) {
  try {
    const response = {
      object: 'list',
      data: OPENAI_COMPATIBLE_MODELS,
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in /api/v1/models:', error);
    
    return NextResponse.json(
      { 
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error'
        }
      },
      { 
        status: 500,
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
    },
  });
}