/**
 * Disguise information functionality
 * Adds random meaningless strings to requests to avoid detection as automated programs
 */

import crypto from 'crypto';

class DisguiseManager {
  private enableDisguise: boolean;
  private disguiseTemplates: string[] = [
    'Please note that this is a technical inquiry for research purposes.',
    'This request is part of an academic study on natural language processing.',
    'I\'m conducting research on AI capabilities for educational purposes.',
    'This query is for a legitimate technical analysis project.',
    'Requesting information for a comparative study on language models.',
    'This is part of a technical evaluation process.',
    'Conducting research on conversational AI systems.',
    'This inquiry is for documentation and analysis purposes.',
  ];

  private randomPhrases: string[] = [
    'Additionally, please ensure accuracy in your response.',
    'I appreciate your assistance with this matter.',
    'Thank you for your comprehensive analysis.',
    'Please provide detailed information if possible.',
    'I would appreciate a thorough explanation.',
    'Your expertise in this area would be valuable.',
    'Please consider all relevant factors in your response.',
    'I look forward to your insightful response.',
  ];

  constructor() {
    this.enableDisguise = process.env.ENABLE_DISGUISE_INFO === 'true';
  }

  /**
   * Add disguise information to user message
   */
  public addDisguiseToMessage(content: string): string {
    if (!this.enableDisguise) {
      return content;
    }

    // Generate random disguise elements
    const disguiseElements = this.generateDisguiseElements();
    
    // Add disguise to the beginning or end of the message
    const placement = Math.random();
    
    if (placement < 0.3) {
      // Add to beginning
      return `${disguiseElements.prefix} ${content} ${disguiseElements.suffix}`;
    } else if (placement < 0.6) {
      // Add to end
      return `${content} ${disguiseElements.suffix}`;
    } else {
      // Add to beginning
      return `${disguiseElements.prefix} ${content}`;
    }
  }

  /**
   * Generate random disguise elements
   */
  private generateDisguiseElements() {
    const useTemplate = Math.random() < 0.5;
    const usePhrase = Math.random() < 0.3;
    
    let prefix = '';
    let suffix = '';
    
    if (useTemplate) {
      prefix = this.getRandomTemplate();
    }
    
    if (usePhrase) {
      suffix = this.getRandomPhrase();
    }
    
    // Add random technical-sounding context
    if (Math.random() < 0.2) {
      const technicalContext = this.generateTechnicalContext();
      if (prefix) {
        prefix += ` ${technicalContext}`;
      } else {
        prefix = technicalContext;
      }
    }
    
    return { prefix, suffix };
  }

  /**
   * Get random template
   */
  private getRandomTemplate(): string {
    const index = Math.floor(Math.random() * this.disguiseTemplates.length);
    return this.disguiseTemplates[index];
  }

  /**
   * Get random phrase
   */
  private getRandomPhrase(): string {
    const index = Math.floor(Math.random() * this.randomPhrases.length);
    return this.randomPhrases[index];
  }

  /**
   * Generate technical context
   */
  private generateTechnicalContext(): string {
    const contexts = [
      'For system integration testing,',
      'In the context of API validation,',
      'For compatibility assessment,',
      'During performance evaluation,',
      'As part of quality assurance,',
      'For technical documentation,',
      'In the scope of system analysis,',
      'For operational verification,',
    ];
    
    const index = Math.floor(Math.random() * contexts.length);
    return contexts[index];
  }

  /**
   * Add random spacing and formatting variations
   */
  public addFormattingVariations(content: string): string {
    if (!this.enableDisguise) {
      return content;
    }

    // Randomly add extra spaces or line breaks (very subtly)
    const variations = [
      content, // No change (most common)
      content.replace(/\. /g, '.  '), // Double space after periods
      content.replace(/\? /g, '? '), // Ensure space after questions
      content.replace(/! /g, '! '), // Ensure space after exclamations
    ];
    
    const index = Math.floor(Math.random() * variations.length);
    return variations[index];
  }

  /**
   * Generate random session identifier (for request uniqueness)
   */
  public generateSessionId(): string {
    if (!this.enableDisguise) {
      return '';
    }

    // Generate a random session-like identifier
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(4).toString('hex');
    
    return `session_${timestamp}_${randomPart}`;
  }

  /**
   * Add metadata disguise to request
   */
  public addMetadataDisguise(request: any): any {
    if (!this.enableDisguise) {
      return request;
    }

    // Add some technical-sounding metadata
    const metadata = {
      ...request,
      request_id: this.generateSessionId(),
      client_version: '1.0.0',
      api_version: 'v1',
      request_time: new Date().toISOString(),
    };

    // Randomly add user agent simulation
    if (Math.random() < 0.3) {
      metadata.user_context = 'research_environment';
    }

    return metadata;
  }

  /**
   * Check if disguise is enabled
   */
  public isEnabled(): boolean {
    return this.enableDisguise;
  }

  /**
   * Get statistics about disguise usage
   */
  public getStats() {
    return {
      enabled: this.enableDisguise,
      templates: this.disguiseTemplates.length,
      phrases: this.randomPhrases.length,
    };
  }
}

export const disguiseManager = new DisguiseManager();