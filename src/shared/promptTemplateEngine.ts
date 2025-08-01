import {
  ImageGenerationParams,
  PromptOptions,
  ValidationResult,
  FrameDefinition,
  GenerationResult,
  ServiceStatus,
  StorageResult,
  ImageMetadata,
  GeneratedImageRecord,
} from './types';

/**
 * Core interface for the Prompt Template Engine
 * Responsible for constructing programmatic prompts based on the structured matrix
 */
export interface PromptTemplateEngine {
  /**
   * Build a complete prompt from the given parameters
   */
  buildPrompt(params: ImageGenerationParams): string;
  
  /**
   * Validate parameter combinations for compatibility
   */
  validateParameters(params: ImageGenerationParams): ValidationResult;
  
  /**
   * Get all available options for prompt generation
   */
  getAvailableOptions(): PromptOptions;
  
  /**
   * Get a specific frame definition by ID
   */
  getFrameDefinition(frameId: string): FrameDefinition | null;
  
  /**
   * Build a frame-specific prompt with exact positioning and lighting
   */
  buildFramePrompt(frameId: string, params: ImageGenerationParams): string;
  
  /**
   * Get compatible options based on current selections
   */
  getCompatibleOptions(params: Partial<ImageGenerationParams>): Partial<PromptOptions>;
}

/**
 * Interface for external AI service integration
 */
export interface ImageGenerationService {
  /**
   * Generate an image using the provided prompt
   */
  generateImage(prompt: string): Promise<GenerationResult>;
  
  /**
   * Get the current status of the service
   */
  getServiceStatus(): Promise<ServiceStatus>;
  
  /**
   * Get service-specific configuration
   */
  getServiceConfig(): ServiceConfig;
}

/**
 * Interface for asset storage management
 */
export interface AssetStorageManager {
  /**
   * Store an image with metadata in R2
   */
  storeImage(imageData: Blob, metadata: ImageMetadata): Promise<StorageResult>;
  
  /**
   * Generate a public URL for an object
   */
  generatePublicUrl(objectKey: string): string;
  
  /**
   * Delete an image from storage
   */
  deleteImage(objectKey: string): Promise<boolean>;
  
  /**
   * Get image metadata
   */
  getImageMetadata(objectKey: string): Promise<ImageMetadata | null>;
}

/**
 * Interface for database operations
 */
export interface DatabaseLayer {
  /**
   * Insert a new generated image record
   */
  insertGeneratedImage(record: GeneratedImageRecord): Promise<string>;
  
  /**
   * Update image status
   */
  updateImageStatus(imageId: string, status: ImageStatus): Promise<boolean>;
  
  /**
   * Get user's generated images
   */
  getUserImages(userId: string, limit?: number): Promise<GeneratedImageRecord[]>;
  
  /**
   * Find image by parameters (for caching)
   */
  getImageByParameters(params: ImageGenerationParams): Promise<GeneratedImageRecord | null>;
  
  /**
   * Cache a prompt for performance optimization
   */
  cachePrompt(parametersHash: string, fullPrompt: string): Promise<boolean>;
  
  /**
   * Get cached prompt
   */
  getCachedPrompt(parametersHash: string): Promise<string | null>;
}

// Additional types for service configuration
export interface ServiceConfig {
  name: string;
  apiEndpoint: string;
  maxRetries: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // ms
  monitoringPeriod: number; // ms
}

// Re-export types that are needed by the interfaces
export type { 
  ImageGenerationParams,
  PromptOptions,
  ValidationResult,
  FrameDefinition,
  GenerationResult,
  ServiceStatus,
  StorageResult,
  ImageMetadata,
  GeneratedImageRecord,
} from './types';

// Additional type for image status
export type ImageStatus = 'PENDING' | 'COMPLETE' | 'FAILED';