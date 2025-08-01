import { 
  ImageGenerationService, 
  ServiceLimits, 
  GenerationErrorType,
  createGenerationError
} from '../imageGenerationService';
import { GenerationResult, ServiceStatus } from '../types';

/**
 * DALL-E API response interface
 */
interface DalleResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

/**
 * DALL-E API error response
 */
interface DalleError {
  error: {
    code: string;
    message: string;
    param?: string;
    type: string;
  };
}

/**
 * DALL-E service adapter implementation
 */
export class DalleAdapter implements ImageGenerationService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model: string = 'dall-e-3';
  private timeout: number = 60000; // 60 seconds
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(apiKey: string, options?: {
    model?: string;
    timeout?: number;
    baseUrl?: string;
  }) {
    if (!apiKey) {
      throw new Error('DALL-E API key is required');
    }
    
    this.apiKey = apiKey;
    if (options?.model) this.model = options.model;
    if (options?.timeout) this.timeout = options.timeout;
    if (options?.baseUrl) this.baseUrl = options.baseUrl;
  }

  getServiceName(): string {
    return 'dalle';
  }

  getServiceLimits(): ServiceLimits {
    return {
      maxPromptLength: 4000,
      rateLimitPerMinute: 5, // DALL-E 3 has strict rate limits
      rateLimitPerHour: 200,
      maxRetries: 3,
      timeoutMs: this.timeout,
      supportedFormats: ['png'],
      maxImageSize: 1024 * 1024 * 10 // 10MB
    };
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    try {
      // Validate prompt length
      if (prompt.length > this.getServiceLimits().maxPromptLength) {
        throw createGenerationError(
          GenerationErrorType.INVALID_PROMPT,
          `Prompt too long. Maximum length is ${this.getServiceLimits().maxPromptLength} characters`,
          false
        );
      }

      // Check rate limiting
      await this.checkRateLimit();

      const requestBody = {
        model: this.model,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      };

      console.log(`DALL-E: Generating image with prompt length: ${prompt.length}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: DalleError = await response.json();
          throw this.handleApiError(response.status, errorData);
        }

        const data: DalleResponse = await response.json();
        
        if (!data.data || data.data.length === 0) {
          throw createGenerationError(
            GenerationErrorType.UNKNOWN_ERROR,
            'No image data returned from DALL-E',
            true
          );
        }

        const imageUrl = data.data[0].url;
        
        console.log(`DALL-E: Successfully generated image`);
        
        return {
          success: true,
          imageUrl: imageUrl
        };

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw createGenerationError(
            GenerationErrorType.TIMEOUT,
            `Request timed out after ${this.timeout}ms`,
            true,
            5000 // Retry after 5 seconds
          );
        }
        
        throw error;
      }

    } catch (error: any) {
      console.error('DALL-E generation error:', error);
      
      if (error.type) {
        // Already a GenerationError
        throw error;
      }
      
      // Wrap unknown errors
      throw createGenerationError(
        GenerationErrorType.UNKNOWN_ERROR,
        error.message || 'Unknown error occurred',
        true
      );
    }
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      
      // Make a simple API call to check service health
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      const responseTime = Date.now() - startTime;
      
      return {
        available: response.ok,
        responseTime,
        lastChecked: new Date().toISOString(),
        errorRate: this.calculateErrorRate()
      };
    } catch (error) {
      console.error('DALL-E health check failed:', error);
      return {
        available: false,
        lastChecked: new Date().toISOString(),
        errorRate: this.calculateErrorRate()
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getServiceStatus();
    return status.available;
  }

  /**
   * Handle DALL-E API errors and convert to GenerationError
   */
  private handleApiError(status: number, errorData: DalleError): GenerationError {
    const error = errorData.error;
    
    switch (status) {
      case 400:
        if (error.code === 'content_policy_violation') {
          return createGenerationError(
            GenerationErrorType.CONTENT_POLICY_VIOLATION,
            error.message,
            false
          );
        }
        return createGenerationError(
          GenerationErrorType.INVALID_PROMPT,
          error.message,
          false
        );
        
      case 401:
        return createGenerationError(
          GenerationErrorType.AUTHENTICATION_ERROR,
          'Invalid API key',
          false
        );
        
      case 429:
        const retryAfter = this.extractRetryAfter(error.message);
        return createGenerationError(
          GenerationErrorType.RATE_LIMITED,
          error.message,
          true,
          retryAfter
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        return createGenerationError(
          GenerationErrorType.SERVICE_UNAVAILABLE,
          'DALL-E service temporarily unavailable',
          true,
          30000 // Retry after 30 seconds
        );
        
      default:
        return createGenerationError(
          GenerationErrorType.UNKNOWN_ERROR,
          error.message || `HTTP ${status} error`,
          true
        );
    }
  }

  /**
   * Extract retry-after time from error message
   */
  private extractRetryAfter(message: string): number {
    // Try to extract retry time from message like "Rate limit reached. Try again in 20s"
    const match = message.match(/try again in (\d+)s/i);
    if (match) {
      return parseInt(match[1]) * 1000;
    }
    
    // Default retry after 60 seconds for rate limits
    return 60000;
  }

  /**
   * Check rate limiting before making request
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const limits = this.getServiceLimits();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.rateLimitWindow) {
      this.requestCount = 0;
    }
    
    if (this.requestCount >= limits.rateLimitPerMinute) {
      const waitTime = this.rateLimitWindow - (now - this.lastRequestTime);
      throw createGenerationError(
        GenerationErrorType.RATE_LIMITED,
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`,
        true,
        waitTime
      );
    }
    
    this.requestCount++;
    this.lastRequestTime = now;
  }

  /**
   * Calculate error rate for monitoring
   */
  private calculateErrorRate(): number {
    // This would typically be calculated from stored metrics
    // For now, return a placeholder
    return 0;
  }
}