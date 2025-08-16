/**
 * Gemini API Key Manager with rotation and validation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface ApiKeyInfo {
  key: string;
  isValid: boolean;
  lastChecked: number;
  errorCount: number;
  lastError?: string;
}

class GeminiKeyManager {
  private keys: ApiKeyInfo[] = [];
  private currentIndex = 0;
  private checkInterval = 5 * 60 * 1000; // 5 minutes
  private maxErrorCount = 3;

  constructor() {
    this.loadKeysFromEnv();
  }

  private loadKeysFromEnv() {
    const keysString = process.env.GEMINI_API_KEYS;
    if (!keysString) {
      throw new Error('GEMINI_API_KEYS environment variable is required');
    }

    const keyList = keysString.split(',').map(key => key.trim()).filter(Boolean);
    if (keyList.length === 0) {
      throw new Error('At least one Gemini API key is required');
    }

    this.keys = keyList.map(key => ({
      key,
      isValid: true,
      lastChecked: 0,
      errorCount: 0,
    }));

    console.log(`Loaded ${this.keys.length} Gemini API keys`);
  }

  /**
   * Get the next available API key using round-robin
   */
  public getNextKey(): string {
    const validKeys = this.getValidKeys();
    
    if (validKeys.length === 0) {
      throw new Error('No valid Gemini API keys available');
    }

    // Round-robin through valid keys
    const key = validKeys[this.currentIndex % validKeys.length];
    this.currentIndex = (this.currentIndex + 1) % validKeys.length;
    
    return key.key;
  }

  /**
   * Get all valid (non-failed) keys
   */
  private getValidKeys(): ApiKeyInfo[] {
    return this.keys.filter(keyInfo => 
      keyInfo.isValid && keyInfo.errorCount < this.maxErrorCount
    );
  }

  /**
   * Mark a key as failed and increment error count
   */
  public markKeyFailed(key: string, error: string) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (keyInfo) {
      keyInfo.errorCount++;
      keyInfo.lastError = error;
      keyInfo.lastChecked = Date.now();
      
      if (keyInfo.errorCount >= this.maxErrorCount) {
        keyInfo.isValid = false;
        console.warn(`API key marked as invalid after ${this.maxErrorCount} failures: ${key.substring(0, 8)}...`);
      }
    }
  }

  /**
   * Mark a key as successful (reset error count)
   */
  public markKeySuccess(key: string) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (keyInfo) {
      keyInfo.errorCount = 0;
      keyInfo.isValid = true;
      keyInfo.lastChecked = Date.now();
      keyInfo.lastError = undefined;
    }
  }

  /**
   * Validate all API keys
   */
  public async validateAllKeys(): Promise<void> {
    const validationPromises = this.keys.map(async (keyInfo) => {
      try {
        const genAI = new GoogleGenerativeAI(keyInfo.key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Simple test request
        await model.generateContent('Hello');
        
        keyInfo.isValid = true;
        keyInfo.errorCount = 0;
        keyInfo.lastChecked = Date.now();
        keyInfo.lastError = undefined;
        
        console.log(`API key validated successfully: ${keyInfo.key.substring(0, 8)}...`);
      } catch (error) {
        keyInfo.errorCount++;
        keyInfo.lastError = error instanceof Error ? error.message : String(error);
        keyInfo.lastChecked = Date.now();
        
        if (keyInfo.errorCount >= this.maxErrorCount) {
          keyInfo.isValid = false;
        }
        
        console.warn(`API key validation failed: ${keyInfo.key.substring(0, 8)}... - ${keyInfo.lastError}`);
      }
    });

    await Promise.allSettled(validationPromises);
  }

  /**
   * Get statistics about API keys
   */
  public getKeyStats() {
    const totalKeys = this.keys.length;
    const validKeys = this.getValidKeys().length;
    const invalidKeys = totalKeys - validKeys;
    
    return {
      total: totalKeys,
      valid: validKeys,
      invalid: invalidKeys,
      keys: this.keys.map(keyInfo => ({
        key: keyInfo.key.substring(0, 8) + '...',
        isValid: keyInfo.isValid,
        errorCount: keyInfo.errorCount,
        lastChecked: keyInfo.lastChecked,
        lastError: keyInfo.lastError,
      })),
    };
  }

  /**
   * Remove invalid keys from the list
   */
  public removeInvalidKeys(): number {
    const initialCount = this.keys.length;
    this.keys = this.keys.filter(keyInfo => keyInfo.isValid && keyInfo.errorCount < this.maxErrorCount);
    const removedCount = initialCount - this.keys.length;
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} invalid API keys`);
      this.currentIndex = 0; // Reset index
    }
    
    return removedCount;
  }

  /**
   * Get list of valid keys (for output)
   */
  public getValidKeysList(): string[] {
    return this.getValidKeys().map(keyInfo => keyInfo.key);
  }
}

// Singleton instance
export const geminiKeyManager = new GeminiKeyManager();