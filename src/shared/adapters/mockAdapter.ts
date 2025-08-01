import { 
  ImageGenerationService, 
  ServiceLimits, 
  GenerationErrorType,
  createGenerationError
} from '../imageGenerationService';
import { GenerationResult, ServiceStatus } from '../types';

/**
 * Mock image generation service for testing and development
 */
export class MockAdapter implements ImageGenerationService {
  private serviceName: string;
  private shouldFail: boolean = false;
  private failureRate: number = 0;
  private responseDelay: number = 1000;
  private isHealthy: boolean = true;
  private requestCount: number = 0;

  constructor(options?: {
    serviceName?: string;
    shouldFail?: boolean;
    failureRate?: number;
    responseDelay?: number;
    isHealthy?: boolean;
  }) {
    this.serviceName = options?.serviceName || 'mock';
    this.shouldFail = options?.shouldFail || false;
    this.failureRate = options?.failureRate || 0;
    this.responseDelay = options?.responseDelay || 1000;
    this.isHealthy = options?.isHealthy !== false;
  }

  getServiceName(): string {
    return this.serviceName;
  }

  getServiceLimits(): ServiceLimits {
    return {
      maxPromptLength: 5000,
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      maxRetries: 3,
      timeoutMs: 30000,
      supportedFormats: ['png', 'jpg'],
      maxImageSize: 1024 * 1024 * 50 // 50MB
    };
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    this.requestCount++;
    
    console.log(`Mock ${this.serviceName}: Generating image with prompt: "${prompt.substring(0, 100)}..."`);

    // Simulate processing delay
    await this.sleep(this.responseDelay);

    // Simulate failures based on configuration
    if (this.shouldFail || (this.failureRate > 0 && Math.random() < this.failureRate)) {
      const errorTypes = [
        GenerationErrorType.SERVICE_UNAVAILABLE,
        GenerationErrorType.RATE_LIMITED,
        GenerationErrorType.TIMEOUT,
        GenerationErrorType.UNKNOWN_ERROR
      ];
      
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      
      throw createGenerationError(
        randomError,
        `Mock ${this.serviceName} simulated failure`,
        true,
        5000 // Retry after 5 seconds
      );
    }

    // Validate prompt length
    if (prompt.length > this.getServiceLimits().maxPromptLength) {
      throw createGenerationError(
        GenerationErrorType.INVALID_PROMPT,
        `Prompt too long. Maximum length is ${this.getServiceLimits().maxPromptLength} characters`,
        false
      );
    }

    // Generate a mock image URL (placeholder image service)
    const imageUrl = this.generateMockImageUrl(prompt);
    
    console.log(`Mock ${this.serviceName}: Successfully generated image`);
    
    return {
      success: true,
      imageUrl: imageUrl
    };
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    // Simulate some response time
    await this.sleep(100);
    
    return {
      available: this.isHealthy,
      responseTime: 100,
      lastChecked: new Date().toISOString(),
      errorRate: this.failureRate
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.isHealthy;
  }

  /**
   * Generate a mock image URL using a placeholder service
   */
  private generateMockImageUrl(prompt: string): string {
    // Use a placeholder image service with dimensions and text
    const width = 1024;
    const height = 1024;
    const text = encodeURIComponent(`Mock Image: ${prompt.substring(0, 20)}...`);
    const backgroundColor = this.generateColorFromPrompt(prompt);
    const textColor = this.getContrastColor(backgroundColor);
    
    return `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${text}`;
  }

  /**
   * Generate a color based on prompt content for visual variety
   */
  private generateColorFromPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to hex color
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return color.padEnd(6, '0');
  }

  /**
   * Get contrasting text color for background
   */
  private getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation
    const r = parseInt(backgroundColor.substring(0, 2), 16);
    const g = parseInt(backgroundColor.substring(2, 4), 16);
    const b = parseInt(backgroundColor.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '000000' : 'FFFFFF';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Configuration methods for testing
   */
  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = Math.max(0, delay);
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }
}

/**
 * Factory function to create different types of mock services
 */
export class MockAdapterFactory {
  static createHealthyService(name: string = 'mock-healthy'): MockAdapter {
    return new MockAdapter({
      serviceName: name,
      isHealthy: true,
      shouldFail: false,
      responseDelay: 500
    });
  }

  static createUnhealthyService(name: string = 'mock-unhealthy'): MockAdapter {
    return new MockAdapter({
      serviceName: name,
      isHealthy: false,
      shouldFail: true,
      responseDelay: 100
    });
  }

  static createFlakyService(name: string = 'mock-flaky', failureRate: number = 0.3): MockAdapter {
    return new MockAdapter({
      serviceName: name,
      isHealthy: true,
      failureRate: failureRate,
      responseDelay: 1000
    });
  }

  static createSlowService(name: string = 'mock-slow', delay: number = 5000): MockAdapter {
    return new MockAdapter({
      serviceName: name,
      isHealthy: true,
      shouldFail: false,
      responseDelay: delay
    });
  }
}