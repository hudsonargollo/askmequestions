import { 
  ImageGenerationService, 
  ServiceLimits, 
  GenerationErrorType,
  createGenerationError
} from '../imageGenerationService';
import { GenerationResult, ServiceStatus } from '../types';

/**
 * Stable Diffusion API response interface
 */
interface StableDiffusionResponse {
  artifacts: Array<{
    base64: string;
    seed: number;
    finishReason: string;
  }>;
}

/**
 * Stable Diffusion error response
 */
interface StableDiffusionError {
  id: string;
  message: string;
  name: string;
}

/**
 * Stable Diffusion service adapter implementation
 * Uses Stability AI's REST API
 */
export class StableDiffusionAdapter implements ImageGenerationService {
  private apiKey: string;
  private baseUrl: string = 'https://api.stability.ai/v1';
  private engineId: string = 'stable-diffusion-xl-1024-v1-0';
  private timeout: number = 120000; // 2 minutes

  constructor(apiKey: string, options?: {
    baseUrl?: string;
    engineId?: string;
    timeout?: number;
  }) {
    if (!apiKey) {
      throw new Error('Stable Diffusion API key is required');
    }
    
    this.apiKey = apiKey;
    if (options?.baseUrl) this.baseUrl = options.baseUrl;
    if (options?.engineId) this.engineId = options.engineId;
    if (options?.timeout) this.timeout = options.timeout;
  }

  getServiceName(): string {
    return 'stable-diffusion';
  }

  getServiceLimits(): ServiceLimits {
    return {
      maxPromptLength: 2000,
      rateLimitPerMinute: 10,
      rateLimitPerHour: 500,
      maxRetries: 3,
      timeoutMs: this.timeout,
      supportedFormats: ['png', 'jpg'],
      maxImageSize: 1024 * 1024 * 15 // 15MB
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

      console.log(`Stable Diffusion: Generating image with prompt length: ${prompt.length}`);

      const requestBody = {
        text_prompts: [
          {
            text: prompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
        style_preset: 'photographic'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/generation/${this.engineId}/text-to-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: StableDiffusionError = await response.json();
          throw this.handleApiError(response.status, errorData);
        }

        const data: StableDiffusionResponse = await response.json();
        
        if (!data.artifacts || data.artifacts.length === 0) {
          throw createGenerationError(
            GenerationErrorType.UNKNOWN_ERROR,
            'No image data returned from Stable Diffusion',
            true
          );
        }

        const artifact = data.artifacts[0];
        
        if (artifact.finishReason !== 'SUCCESS') {
          throw createGenerationError(
            GenerationErrorType.CONTENT_POLICY_VIOLATION,
            `Generation failed: ${artifact.finishReason}`,
            false
          );
        }

        // Convert base64 to data URL
        const imageUrl = `data:image/png;base64,${artifact.base64}`;
        
        console.log(`Stable Diffusion: Successfully generated image`);
        
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
            10000 // Retry after 10 seconds
          );
        }
        
        throw error;
      }

    } catch (error: any) {
      console.error('Stable Diffusion generation error:', error);
      
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
      
      // Check available engines to verify service health
      const response = await fetch(`${this.baseUrl}/engines/list`, {
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
      console.error('Stable Diffusion health check failed:', error);
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
   * Handle Stable Diffusion API errors
   */
  private handleApiError(status: number, errorData: StableDiffusionError): GenerationError {
    const message = errorData.message || `HTTP ${status} error`;
    
    switch (status) {
      case 400:
        if (message.toLowerCase().includes('content')) {
          return createGenerationError(
            GenerationErrorType.CONTENT_POLICY_VIOLATION,
            message,
            false
          );
        }
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
        
      case 402:
        return createGenerationError(
          GenerationErrorType.QUOTA_EXCEEDED,
          'Insufficient credits',
          false
        );
        
      case 429:
        return createGenerationError(
          GenerationErrorType.RATE_LIMITED,
          message,
          true,
          60000 // Retry after 1 minute
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        return createGenerationError(
          GenerationErrorType.SERVICE_UNAVAILABLE,
          'Stable Diffusion service temporarily unavailable',
          true,
          30000 // Retry after 30 seconds
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
   * Calculate error rate for monitoring
   */
  private calculateErrorRate(): number {
    // This would typically be calculated from stored metrics
    // For now, return a placeholder
    return 0;
  }

  /**
   * Convert base64 image to blob for storage
   */
  async convertBase64ToBlob(base64Data: string): Promise<Blob> {
    const response = await fetch(`data:image/png;base64,${base64Data}`);
    return response.blob();
  }

  /**
   * Get available engines for this API key
   */
  async getAvailableEngines(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/engines/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch engines');
      }

      const data = await response.json();
      return data.map((engine: any) => engine.id);
    } catch (error) {
      console.error('Failed to get available engines:', error);
      return [this.engineId]; // Return default engine
    }
  }
}