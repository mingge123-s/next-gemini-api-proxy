/**
 * Gemini API Client with retry logic and error handling
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { geminiKeyManager } from './key-manager';
import { getActualModelName, isSearchModel } from './config';
import { disguiseManager } from '../api/disguise';

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface GeminiChatRequest {
  model: string;
  messages: GeminiMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  functions?: any[];
  function_call?: any;
}

export interface GeminiChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      function_call?: any;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GeminiClient {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Send chat completion request to Gemini
   */
  async chatCompletion(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    const actualModel = getActualModelName(request.model);
    const useSearch = isSearchModel(request.model);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const apiKey = geminiKeyManager.getNextKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Configure model with search tools if needed
        const modelConfig: any = { model: actualModel };
        if (useSearch) {
          modelConfig.tools = [{ googleSearchRetrieval: {} }];
        }
        
        const model = genAI.getGenerativeModel(modelConfig);
        
        // Convert messages to Gemini format
        const history = this.convertMessagesToGemini(request.messages);
        const chat = model.startChat({ history: history.history });
        
        // Generate response
        const result = await chat.sendMessage(history.lastMessage);
        const response = await result.response;
        
        // Mark key as successful
        geminiKeyManager.markKeySuccess(apiKey);
        
        // Convert response to OpenAI format
        return this.convertResponseToOpenAI(response, request.model);
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error);
        
        // Mark key as failed if it was an API key issue
        if (this.isApiKeyError(error)) {
          const apiKey = geminiKeyManager.getNextKey();
          geminiKeyManager.markKeyFailed(apiKey, lastError.message);
        }
        
        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Send streaming chat completion request to Gemini
   */
  async* chatCompletionStream(request: GeminiChatRequest): AsyncGenerator<string, void, unknown> {
    const actualModel = getActualModelName(request.model);
    const useSearch = isSearchModel(request.model);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const apiKey = geminiKeyManager.getNextKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Configure model with search tools if needed
        const modelConfig: any = { model: actualModel };
        if (useSearch) {
          modelConfig.tools = [{ googleSearchRetrieval: {} }];
        }
        
        const model = genAI.getGenerativeModel(modelConfig);
        
        // Convert messages to Gemini format
        const history = this.convertMessagesToGemini(request.messages);
        const chat = model.startChat({ history: history.history });
        
        // Generate streaming response
        const result = await chat.sendMessageStream(history.lastMessage);
        
        // Mark key as successful
        geminiKeyManager.markKeySuccess(apiKey);
        
        // Stream response in OpenAI format
        let index = 0;
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            const sseData = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [{
                index: 0,
                delta: { content: text },
                finish_reason: null,
              }],
            };
            
            yield `data: ${JSON.stringify(sseData)}\n\n`;
            index++;
          }
        }
        
        // Send final chunk
        const finalChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop',
          }],
        };
        
        yield `data: ${JSON.stringify(finalChunk)}\n\n`;
        yield `data: [DONE]\n\n`;
        
        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini streaming attempt ${attempt + 1} failed:`, error);
        
        // Mark key as failed if it was an API key issue
        if (this.isApiKeyError(error)) {
          const apiKey = geminiKeyManager.getNextKey();
          geminiKeyManager.markKeyFailed(apiKey, lastError.message);
        }
        
        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }
    
    throw new Error(`Streaming failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Convert OpenAI messages to Gemini format
   */
  private convertMessagesToGemini(messages: GeminiMessage[]) {
    const history: any[] = [];
    let lastMessage = '';
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (i === messages.length - 1) {
        // Last message becomes the prompt
        if (typeof message.content === 'string') {
          // Apply disguise to the last user message
          const disguisedContent = message.role === 'user' 
            ? disguiseManager.addDisguiseToMessage(message.content)
            : message.content;
          lastMessage = disguiseManager.addFormattingVariations(disguisedContent);
        } else {
          // Handle multimodal content - convert to string for now
          lastMessage = JSON.stringify(message.content);
        }
      } else {
        // Add to history
        if (message.role === 'user') {
          const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
          // Apply disguise to user messages in history
          const disguisedContent = disguiseManager.addDisguiseToMessage(content);
          history.push({
            role: 'user',
            parts: [{ text: disguiseManager.addFormattingVariations(disguisedContent) }],
          });
        } else if (message.role === 'assistant') {
          history.push({
            role: 'model',
            parts: [{ text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }],
          });
        }
        // Skip system messages as Gemini handles them differently
      }
    }
    
    return { history, lastMessage };
  }

  /**
   * Convert Gemini response to OpenAI format
   */
  private convertResponseToOpenAI(response: any, model: string): GeminiChatResponse {
    const text = response.text() || '';
    
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: text,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0, // Gemini doesn't provide token counts
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * Check if error is related to API key
   */
  private isApiKeyError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('api key') || 
           message.includes('unauthorized') || 
           message.includes('invalid key') ||
           message.includes('quota exceeded');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const geminiClient = new GeminiClient();