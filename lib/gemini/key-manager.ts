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
   * Mark a key as failed and increment error count with better error classification
   */
  public markKeyFailed(key: string, error: string) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (keyInfo) {
      keyInfo.errorCount++;
      keyInfo.lastError = error;
      keyInfo.lastChecked = Date.now();
      
      // Check for permanent errors that should immediately invalidate the key
      const isPermanentError = error.includes('API_KEY_INVALID') || 
                              error.includes('PERMISSION_DENIED') ||
                              error.includes('Invalid API key') ||
                              error.includes('API key not valid');
      
      if (isPermanentError) {
        keyInfo.isValid = false;
        keyInfo.errorCount = this.maxErrorCount;
        console.error(`❌ API key permanently disabled: ${key.substring(0, 12)}... - ${error}`);
      } else if (keyInfo.errorCount >= this.maxErrorCount) {
        keyInfo.isValid = false;
        console.warn(`⚠️  API key temporarily disabled after ${this.maxErrorCount} failures: ${key.substring(0, 12)}... - ${error}`);
      } else {
        console.warn(`⚠️  API key error (${keyInfo.errorCount}/${this.maxErrorCount}): ${key.substring(0, 12)}... - ${error}`);
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
   * Validate a single API key with improved error handling
   */
  private async validateSingleKey(keyInfo: ApiKeyInfo): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(keyInfo.key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Use a simple, fast test request
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
        generationConfig: {
          maxOutputTokens: 1,
          temperature: 0,
        },
      });
      
      // Check if we got a valid response
      if (result && result.response) {
        keyInfo.isValid = true;
        keyInfo.errorCount = 0;
        keyInfo.lastChecked = Date.now();
        keyInfo.lastError = undefined;
        console.log(`✅ API key validated: ${keyInfo.key.substring(0, 12)}...`);
        return true;
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      keyInfo.errorCount++;
      keyInfo.lastError = errorMessage;
      keyInfo.lastChecked = Date.now();
      
      // Check for specific error types that indicate permanent issues
      const isPermanentError = errorMessage.includes('API_KEY_INVALID') || 
                              errorMessage.includes('PERMISSION_DENIED') ||
                              errorMessage.includes('Invalid API key');
      
      if (isPermanentError) {
        keyInfo.isValid = false;
        keyInfo.errorCount = this.maxErrorCount;
        console.error(`❌ API key permanently invalid: ${keyInfo.key.substring(0, 12)}... - ${errorMessage}`);
      } else if (keyInfo.errorCount >= this.maxErrorCount) {
        keyInfo.isValid = false;
        console.warn(`⚠️  API key marked invalid after ${this.maxErrorCount} failures: ${keyInfo.key.substring(0, 12)}... - ${errorMessage}`);
      } else {
        console.warn(`⚠️  API key validation failed (${keyInfo.errorCount}/${this.maxErrorCount}): ${keyInfo.key.substring(0, 12)}... - ${errorMessage}`);
      }
      
      return false;
    }
  }

  /**
   * Validate all API keys with improved concurrency control
   */
  public async validateAllKeys(): Promise<{ validated: number; failed: number; total: number }> {
    console.log('🔍 Starting API key validation...');
    
    let validated = 0;
    let failed = 0;
    
    // Validate keys in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < this.keys.length; i += batchSize) {
      const batch = this.keys.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(keyInfo => this.validateSingleKey(keyInfo))
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validated++;
        } else {
          failed++;
        }
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < this.keys.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Validation complete: ${validated} valid, ${failed} failed out of ${this.keys.length} total`);
    return { validated, failed, total: this.keys.length };
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