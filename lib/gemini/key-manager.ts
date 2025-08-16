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
    const lastValidated = this.keys.length > 0 ? Math.max(...this.keys.map(k => k.lastChecked)) : null;
    
    return {
      total: totalKeys,
      valid: validKeys,
      invalid: invalidKeys,
      lastValidated: lastValidated && lastValidated > 0 ? new Date(lastValidated).toISOString() : null,
      keys: this.keys.map(keyInfo => ({
        key: keyInfo.key.substring(0, 12) + '...',
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

  /**
   * Add a new API key to the manager
   */
  public addKey(key: string): { success: boolean; message?: string } {
    // Validate key format
    if (!key || typeof key !== 'string') {
      return { success: false, message: 'API 密钥格式无效' };
    }

    const trimmedKey = key.trim();
    if (!trimmedKey.startsWith('AIza') || trimmedKey.length < 30) {
      return { success: false, message: 'API 密钥格式无效，必须以 AIza 开头且长度足够' };
    }

    // Check if key already exists
    if (this.keys.some(k => k.key === trimmedKey)) {
      return { success: false, message: 'API 密钥已存在' };
    }

    // Add the key
    this.keys.push({
      key: trimmedKey,
      isValid: true,
      lastChecked: 0,
      errorCount: 0,
    });

    console.log(`✅ Added new API key ending in ${trimmedKey.slice(-6)}`);
    return { success: true };
  }

  /**
   * Remove an API key from the manager
   */
  public removeKey(key: string): { success: boolean; message?: string } {
    if (!key || typeof key !== 'string') {
      return { success: false, message: 'API 密钥无效' };
    }

    // Find key by exact match or partial match (last 6 characters)
    const keyIndex = this.keys.findIndex(k => {
      return k.key === key || k.key.endsWith(key.slice(-6)) || key.endsWith(k.key.slice(-6));
    });
    
    if (keyIndex === -1) {
      return { success: false, message: 'API 密钥未找到' };
    }

    // Don't allow removing the last valid key
    const validKeys = this.getValidKeys();
    if (validKeys.length === 1 && validKeys[0].key === this.keys[keyIndex].key) {
      return { success: false, message: '不能删除最后一个有效的 API 密钥' };
    }

    const removedKey = this.keys[keyIndex];
    this.keys.splice(keyIndex, 1);
    
    // Reset current index if needed
    if (this.currentIndex >= this.keys.length) {
      this.currentIndex = 0;
    }
    
    console.log(`🗑️ Removed API key ending in ${removedKey.key.slice(-6)}`);
    return { success: true };
  }

  /**
   * Get all keys with their status (for admin dashboard)
   */
  public getAllKeys(): Array<{ key: string; isValid: boolean; lastChecked: number; errorCount: number; lastError?: string }> {
    return this.keys.map(k => ({
      key: k.key,
      isValid: k.isValid,
      lastChecked: k.lastChecked,
      errorCount: k.errorCount,
      lastError: k.lastError
    }));
  }
}

// Singleton instance
export const geminiKeyManager = new GeminiKeyManager();