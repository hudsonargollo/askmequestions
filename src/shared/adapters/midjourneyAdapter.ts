import { 
  ImageGenerationService, 
  ServiceLimits, 
  GenerationErrorType,
  createGenerationError
} from '../imageGenerationService';
import { GenerationResult, ServiceStatus } from '../types';

/**
 * Midjourney API response interface
 * Note: This is based on common Midjourney API patterns
 * Actual implementation may vary based on the specific API used
 */
interface MidjourneyResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  progress?: number;
  error?: string;
}

/**
 * Midjourney job status response
 */
interface MidjourneyJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  progress?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Midjourney service adapter implementation
 * Note: This implementation assumes a REST API wrapper for Midjourney
 * Actual implementation will depend on the specific Midjourney API service used
 */
export class MidjourneyAdapter implements ImageGenerationService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number = 300000; // 5 minutes (Midjourney can be slow)
  private pollInterval: number = 5000; // 5 seconds
  private maxPollAttempts: number = 60; // 5 minutes total

  constructor(apiKey: string, options?: {
    baseUrl?: string;
    timeout?: number;
    pollInterval?: number;
  }) {
    if (!apiKey) {
      throw new Error('Midjourney API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || 'https://api.midjourney.com/v1';
    if (options?.timeout) this.timeout = options.timeout;
    if (options?.pollInterval) this.pollInterval = options.pollInterval;
  }

  getServiceName(): string {
    return 'midjourney';
  }

  getServiceLimits(): ServiceLimits {
    return {
      maxPromptLength: 2000,
      rateLimitPerMinute: 3, // Midjourney has strict rate limits
      rateLimitPerHour: 100,
      maxRetries: 2,
      timeoutMs: this.timeout,
      supportedFormats: ['png', 'jpg'],
      maxImageSize: 1024 * 1024 * 20 // 20MB
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

      console.log(`Midjourney: Starting image generation with prompt length: ${prompt.length}`);

      // Step 1: Submit the generation job
      const jobId = await this.submitGenerationJob(prompt);
      
      // Step 2: Poll for completion
      const result = await this.pollForCompletion(jobId);
      
      console.log(`Midjourney: Successfully generated image`);
      
      return {
        success: true,
        imageUrl: result.imageUrl
      };

    } catch (error: any) {
      console.error('Midjourney generation error:', error);
      
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
      
      // Check service health endpoint
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;
      
      return {
        available: response.ok,
        responseTime,
        lastChecked: new Date().toISOString(),
        errorRate: this.calculateErrorRate()
      };
    } catch (error) {
      console.error('Midjourney health check failed:', error);
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
   * Submit a generation job to Midjourney
   */
  private async submitGenerationJob(prompt: string): Promise<string> {
    const requestBody = {
      prompt: prompt,
      aspect_ratio: '1:1',
      quality: 'high',
      style: 'raw' // Use raw style for more control
    };

    const response = await fetch(`${this.baseUrl}/imagine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000) // 30 second timeout for job submission
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.handleApiError(response.status, errorData);
    }

    const data: MidjourneyResponse = await response.json();
    
    if (!data.id) {
      throw createGenerationError(
        GenerationErrorType.UNKNOWN_ERROR,
        'No job ID returned from Midjourney',
        true
      );
    }

    return data.id;
  }

  /**
   * Poll for job completion
   */
  private async pollForCompletion(jobId: string): Promise<MidjourneyJobStatus> {
    let attempts = 0;
    
    while (attempts < this.maxPollAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout for status check
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw this.handleApiError(response.status, errorData);
        }

        const status: MidjourneyJobStatus = await response.json();
        
        console.log(`Midjourney: Job ${jobId} status: ${status.status}, progress: ${status.progress || 0}%`);
        
        switch (status.status) {
          case 'completed':
            if (!status.imageUrl) {
              throw createGenerationError(
                GenerationErrorType.UNKNOWN_ERROR,
                'Job completed but no image URL provided',
                true
              );
            }
            return status;
            
          case 'failed':
            throw createGenerationError(
              GenerationErrorType.UNKNOWN_ERROR,
              status.error || 'Generation failed',
              true
            );
            
          case 'pending':
          case 'processing':
            // Continue polling
            break;
            
          default:
            throw createGenerationError(
              GenerationErrorType.UNKNOWN_ERROR,
              `Unknown job status: ${status.status}`,
              true
            );
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
        attempts++;
        
      } catch (error: any) {
        if (error.type) {
          throw error; // Re-throw GenerationError
        }
        
        attempts++;
        if (attempts >= this.maxPollAttempts) {
          throw createGenerationError(
            GenerationErrorType.TIMEOUT,
            'Polling timeout exceeded',
            true,
            60000 // Retry after 1 minute
          );
        }
        
        // Wait before retry
        await this.sleep(this.pollInterval);
      }
    }
    
    throw createGenerationError(
      GenerationErrorType.TIMEOUT,
      'Maximum polling attempts exceeded',
      true,
      60000 // Retry after 1 minute
    );
  }

  /**
   * Handle Midjourney API errors
   */
  private handleApiError(status: number, errorData: any): GenerationError {
    const message = errorData.error?.message || errorData.message || `HTTP ${status} error`;
    
    switch (status) {
      case 400:
        return createGenerationError(
          GenerationErrorType.INVALID_PROMPT,
          message,
          false
        );
        
      case 401:
        return createGenerationError(
          GenerationErrorType.AUTHENTICATION_ERROR,
          'Invalid API key',
          false
        );
        
      case 429:
        const retryAfter = this.extractRetryAfter(errorData);
        return createGenerationError(
          GenerationErrorType.RATE_LIMITED,
          message,
          true,
          retryAfter
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        return createGenerationError(
          GenerationErrorType.SERVICE_UNAVAILABLE,
          'Midjourney service temporarily unavailable',
          true,
          60000 // Retry after 1 minute
        );
        
      default:
        return createGenerationError(
          GenerationErrorType.UNKNOWN_ERROR,
          message,
          true
        );
    }
  }

  /**
   * Extract retry-after time from error response
   */
  private extractRetryAfter(errorData: any): number {
    if (errorData.retryAfter) {
      return errorData.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Default retry after 2 minutes for rate limits
    return 120000;
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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