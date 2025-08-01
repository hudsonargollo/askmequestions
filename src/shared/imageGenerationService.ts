import { GenerationResult, ServiceStatus } from './types';

/**
 * Base interface for all image generation services
 * Provides a unified API for different AI service providers
 */
export interface ImageGenerationService {
  /**
   * Generate an image from a text prompt
   * @param prompt The text prompt for image generation
   * @returns Promise resolving to generation result
   */
  generateImage(prompt: string): Promise<GenerationResult>;

  /**
   * Get the current status of the service
   * @returns Promise resolving to service status
   */
  getServiceStatus(): Promise<ServiceStatus>;

  /**
   * Get the service name/identifier
   */
  getServiceName(): string;

  /**
   * Check if the service is currently available
   * @returns Promise resolving to availability status
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get service-specific configuration or limits
   */
  getServiceLimits(): ServiceLimits;
}

/**
 * Service limits and configuration
 */
export interface ServiceLimits {
  maxPromptLength: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  maxRetries: number;
  timeoutMs: number;
  supportedFormats: string[];
  maxImageSize: number;
}

/**
 * Service discovery and failover manager
 * Manages multiple image generation services with automatic failover
 */
export interface ServiceDiscovery {
  /**
   * Get the primary available service
   */
  getPrimaryService(): Promise<ImageGenerationService | null>;

  /**
   * Get all available services in priority order
   */
  getAvailableServices(): Promise<ImageGenerationService[]>;

  /**
   * Register a new service
   */
  registerService(service: ImageGenerationService, priority: number): void;

  /**
   * Remove a service from the registry
   */
  unregisterService(serviceName: string): void;

  /**
   * Update service health status
   */
  updateServiceHealth(serviceName: string, isHealthy: boolean): void;

  /**
   * Get service health statistics
   */
  getServiceStats(serviceName: string): ServiceStats | null;
}

/**
 * Service statistics for monitoring
 */
export interface ServiceStats {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastSuccessfulRequest: Date | null;
  lastFailedRequest: Date | null;
  isHealthy: boolean;
  consecutiveFailures: number;
}

/**
 * Configuration for service adapters
 */
export interface ServiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
}

/**
 * Error types that can occur during image generation
 */
export enum GenerationErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_PROMPT = 'INVALID_PROMPT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Detailed error information for generation failures
 */
export interface GenerationError extends Error {
  type: GenerationErrorType;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
}

/**
 * Create a generation error with proper typing
 */
export function createGenerationError(
  type: GenerationErrorType,
  message: string,
  retryable: boolean = false,
  retryAfter?: number,
  details?: Record<string, any>
): GenerationError {
  const error = new Error(message) as GenerationError;
  error.type = type;
  error.retryable = retryable;
  error.retryAfter = retryAfter;
  error.details = details;
  return error;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error && typeof error === 'object' && 'retryable' in error) {
    return error.retryable === true;
  }
  
  // Default retryable error types
  const retryableTypes = [
    GenerationErrorType.SERVICE_UNAVAILABLE,
    GenerationErrorType.TIMEOUT,
    GenerationErrorType.RATE_LIMITED
  ];
  
  return error && error.type && retryableTypes.includes(error.type);
}