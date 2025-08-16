/**
 * Fake streaming functionality
 * Maintains connection with keep-alive chunks while making a single non-streaming request
 */

import { geminiClient, GeminiChatRequest } from '@/lib/gemini/client';

export class FakeStreamingManager {
  private keepAliveInterval: number = 2000; // 2 seconds
  private maxWaitTime: number = 120000; // 2 minutes

  /**
   * Handle fake streaming request
   */
  async handleFakeStreaming(
    request: GeminiChatRequest,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): Promise<void> {
    const encoder = new TextEncoder();
    let keepAliveTimer: NodeJS.Timeout | null = null;
    let completed = false;

    try {
      // Start sending keep-alive chunks
      keepAliveTimer = setInterval(() => {
        if (!completed) {
          // Send empty chunk to keep connection alive
          const keepAliveChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: null,
            }],
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(keepAliveChunk)}\n\n`));
        }
      }, this.keepAliveInterval);

      // Make actual non-streaming request to Gemini
      const response = await geminiClient.chatCompletion({
        ...request,
        stream: false, // Force non-streaming
      });

      completed = true;

      // Clear keep-alive timer
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }

      // Send the complete response as chunks
      const content = response.choices[0]?.message?.content || '';
      
      if (content) {
        // Split content into chunks for realistic streaming appearance
        const chunks = this.splitIntoChunks(content);
        
        for (const chunk of chunks) {
          const streamChunk = {
            id: response.id,
            object: 'chat.completion.chunk',
            created: response.created,
            model: response.model,
            choices: [{
              index: 0,
              delta: { content: chunk },
              finish_reason: null,
            }],
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
          
          // Small delay between chunks for realistic streaming
          await this.delay(50);
        }
      }

      // Send final chunk
      const finalChunk = {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: response.choices[0]?.finish_reason || 'stop',
        }],
        usage: response.usage,
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

    } catch (error) {
      completed = true;
      
      // Clear keep-alive timer
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }

      // Send error as streaming chunk
      const errorChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'error',
        }],
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'server_error',
          code: 'internal_error',
        },
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      
      throw error;
    } finally {
      // Ensure timer is cleared
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
      }
    }
  }

  /**
   * Split content into realistic chunks
   */
  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    const words = content.split(/(\s+)/); // Split by whitespace but keep separators
    
    let currentChunk = '';
    const maxChunkSize = 10; // words per chunk
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordCount = currentChunk.split(/\s+/).filter(Boolean).length;
      
      if (wordCount >= maxChunkSize && currentChunk.trim()) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk += word;
      }
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(chunk => chunk.trim()); // Remove empty chunks
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const fakeStreamingManager = new FakeStreamingManager();