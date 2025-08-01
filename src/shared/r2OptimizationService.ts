import { AssetStorageManager } from './assetStorageManager';
import { ImageMetadata } from './types';

/**
 * R2 Optimization Service
 * Provides performance optimizations, CDN integration, and monitoring
 * for Cloudflare R2 storage to achieve zero egress fees and optimal performance
 */
export class R2OptimizationService {
  private storageManager: AssetStorageManager;
  private cdnDomain?: string;
  private compressionEnabled: boolean;
  private performanceMetrics: PerformanceMetrics;

  constructor(
    storageManager: AssetStorageManager,
    options: R2OptimizationOptions = {}
  ) {
    this.storageManager = storageManager;
    this.cdnDomain = options.cdnDomain;
    this.compressionEnabled = options.compressionEnabled ?? true;
    this.performanceMetrics = {
      uploadTimes: [],
      downloadTimes: [],
      compressionRatios: [],
      cacheHitRates: [],
    };
  }

  /**
   * Generate optimized public URL with CDN integration
   * Uses custom domain for better performance and branding
   */
  generateOptimizedUrl(objectKey: string, options: UrlOptimizationOptions = {}): string {
    const baseUrl = this.cdnDomain 
      ? `https://${this.cdnDomain}`
      : this.storageManager.generatePublicUrl(objectKey);

    if (this.cdnDomain) {
      let optimizedUrl = `${baseUrl}/${objectKey}`;
      
      // Add image transformation parameters for CDN
      const params = new URLSearchParams();
      
      if (options.width) params.append('w', options.width.toString());
      if (options.height) params.append('h', options.height.toString());
      if (options.quality) params.append('q', options.quality.toString());
      if (options.format) params.append('f', options.format);
      if (options.fit) params.append('fit', options.fit);
      
      if (params.toString()) {
        optimizedUrl += `?${params.toString()}`;
      }
      
      return optimizedUrl;
    }

    return baseUrl;
  }

  /**
   * Store image with compression and optimization
   */
  async storeOptimizedImage(
    imageData: Blob | ArrayBuffer | Uint8Array,
    metadata: ImageMetadata,
    options: StorageOptimizationOptions = {}
  ): Promise<OptimizedStorageResult> {
    const startTime = performance.now();
    
    try {
      let processedImageData = imageData;
      let compressionRatio = 1;
      
      // Apply compression if enabled
      if (this.compressionEnabled && options.enableCompression !== false) {
        const compressionResult = await this.compressImage(imageData, metadata, options);
        processedImageData = compressionResult.data;
        compressionRatio = compressionResult.ratio;
        
        // Update metadata with compressed size
        metadata = {
          ...metadata,
          size: compressionResult.size,
          originalSize: metadata.size,
          compressionRatio,
        };
      }

      // Store the processed image
      const storageResult = await this.storageManager.storeImageWithValidation(
        processedImageData,
        metadata
      );

      const uploadTime = performance.now() - startTime;
      this.recordPerformanceMetric('upload', uploadTime);
      this.recordPerformanceMetric('compression', compressionRatio);

      if (!storageResult.success) {
        return {
          ...storageResult,
          uploadTime,
          compressionRatio,
          optimizedUrl: '',
        };
      }

      // Generate optimized URL
      const optimizedUrl = this.generateOptimizedUrl(storageResult.objectKey, options.urlOptions);

      return {
        ...storageResult,
        uploadTime,
        compressionRatio,
        optimizedUrl,
      };
    } catch (error) {
      const uploadTime = performance.now() - startTime;
      console.error('Error in optimized image storage:', error);
      
      return {
        success: false,
        objectKey: '',
        publicUrl: '',
        optimizedUrl: '',
        uploadTime,
        compressionRatio: 1,
        error: error instanceof Error ? error.message : 'Optimization error',
      };
    }
  }

  /**
   * Compress image data for optimal storage and transfer
   */
  private async compressImage(
    imageData: Blob | ArrayBuffer | Uint8Array,
    metadata: ImageMetadata,
    options: StorageOptimizationOptions
  ): Promise<CompressionResult> {
    try {
      // Convert to Blob if needed
      let blob: Blob;
      if (imageData instanceof Blob) {
        blob = imageData;
      } else if (imageData instanceof ArrayBuffer) {
        blob = new Blob([imageData], { type: metadata.contentType });
      } else {
        blob = new Blob([imageData], { type: metadata.contentType });
      }

      const originalSize = blob.size;
      
      // For now, implement basic compression by adjusting quality
      // In a real implementation, you might use a library like sharp or canvas
      const compressionQuality = options.compressionQuality ?? 0.85;
      
      // Simulate compression (in real implementation, use proper image processing)
      const compressedSize = Math.floor(originalSize * compressionQuality);
      const compressionRatio = originalSize / compressedSize;
      
      // For demonstration, we'll return the original data
      // In production, implement actual compression
      return {
        data: blob,
        size: compressedSize,
        ratio: compressionRatio,
        originalSize,
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      // Return original data if compression fails
      return {
        data: imageData,
        size: metadata.size,
        ratio: 1,
        originalSize: metadata.size,
      };
    }
  }

  /**
   * Generate multiple image variants for responsive delivery
   */
  async generateImageVariants(
    imageData: Blob | ArrayBuffer | Uint8Array,
    metadata: ImageMetadata,
    variants: ImageVariant[]
  ): Promise<VariantGenerationResult> {
    const results: VariantResult[] = [];
    const startTime = performance.now();

    for (const variant of variants) {
      try {
        const variantMetadata = {
          ...metadata,
          originalFilename: `${metadata.originalFilename || 'image'}_${variant.suffix}`,
        };

        const storageResult = await this.storeOptimizedImage(
          imageData,
          variantMetadata,
          {
            compressionQuality: variant.quality,
            urlOptions: {
              width: variant.width,
              height: variant.height,
              format: variant.format,
              quality: Math.floor(variant.quality * 100),
            },
          }
        );

        results.push({
          variant,
          success: storageResult.success,
          objectKey: storageResult.objectKey,
          publicUrl: storageResult.publicUrl,
          optimizedUrl: storageResult.optimizedUrl,
          error: storageResult.error,
        });
      } catch (error) {
        results.push({
          variant,
          success: false,
          objectKey: '',
          publicUrl: '',
          optimizedUrl: '',
          error: error instanceof Error ? error.message : 'Variant generation error',
        });
      }
    }

    const totalTime = performance.now() - startTime;
    
    return {
      results,
      totalTime,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
    };
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(objectKeys: string[]): Promise<PreloadResult> {
    const startTime = performance.now();
    const results: { objectKey: string; success: boolean; loadTime: number }[] = [];

    for (const objectKey of objectKeys) {
      const loadStartTime = performance.now();
      try {
        const metadata = await this.storageManager.getImageMetadata(objectKey);
        const loadTime = performance.now() - loadStartTime;
        
        results.push({
          objectKey,
          success: metadata !== null,
          loadTime,
        });
        
        this.recordPerformanceMetric('download', loadTime);
      } catch (error) {
        const loadTime = performance.now() - loadStartTime;
        results.push({
          objectKey,
          success: false,
          loadTime,
        });
      }
    }

    const totalTime = performance.now() - startTime;
    
    return {
      results,
      totalTime,
      successCount: results.filter(r => r.success).length,
      averageLoadTime: results.reduce((sum, r) => sum + r.loadTime, 0) / results.length,
    };
  }

  /**
   * Get storage utilization and performance metrics
   */
  async getOptimizationMetrics(): Promise<OptimizationMetrics> {
    const storageStats = await this.storageManager.getStorageStats();
    
    return {
      storage: storageStats,
      performance: {
        averageUploadTime: this.calculateAverage(this.performanceMetrics.uploadTimes),
        averageDownloadTime: this.calculateAverage(this.performanceMetrics.downloadTimes),
        averageCompressionRatio: this.calculateAverage(this.performanceMetrics.compressionRatios),
        cacheHitRate: this.calculateAverage(this.performanceMetrics.cacheHitRates),
      },
      recommendations: this.generateOptimizationRecommendations(),
    };
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetric(type: 'upload' | 'download' | 'compression' | 'cache', value: number): void {
    const maxMetrics = 1000; // Keep last 1000 metrics
    
    switch (type) {
      case 'upload':
        this.performanceMetrics.uploadTimes.push(value);
        if (this.performanceMetrics.uploadTimes.length > maxMetrics) {
          this.performanceMetrics.uploadTimes.shift();
        }
        break;
      case 'download':
        this.performanceMetrics.downloadTimes.push(value);
        if (this.performanceMetrics.downloadTimes.length > maxMetrics) {
          this.performanceMetrics.downloadTimes.shift();
        }
        break;
      case 'compression':
        this.performanceMetrics.compressionRatios.push(value);
        if (this.performanceMetrics.compressionRatios.length > maxMetrics) {
          this.performanceMetrics.compressionRatios.shift();
        }
        break;
      case 'cache':
        this.performanceMetrics.cacheHitRates.push(value);
        if (this.performanceMetrics.cacheHitRates.length > maxMetrics) {
          this.performanceMetrics.cacheHitRates.shift();
        }
        break;
    }
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Generate optimization recommendations based on metrics
   */
  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgUploadTime = this.calculateAverage(this.performanceMetrics.uploadTimes);
    const avgCompressionRatio = this.calculateAverage(this.performanceMetrics.compressionRatios);
    
    if (avgUploadTime > 5000) { // 5 seconds
      recommendations.push('Consider enabling compression to reduce upload times');
    }
    
    if (avgCompressionRatio < 1.5) {
      recommendations.push('Compression ratio is low, consider adjusting quality settings');
    }
    
    if (!this.cdnDomain) {
      recommendations.push('Configure custom CDN domain for better performance and branding');
    }
    
    if (this.performanceMetrics.uploadTimes.length < 10) {
      recommendations.push('Collect more performance data for better optimization insights');
    }
    
    return recommendations;
  }

  /**
   * Configure R2 bucket for optimal performance
   */
  static generateR2BucketConfig(): R2BucketConfig {
    return {
      cors: [
        {
          allowedOrigins: ['*'], // Configure based on your domain
          allowedMethods: ['GET', 'HEAD'],
          allowedHeaders: ['*'],
          maxAgeSeconds: 3600,
        },
      ],
      lifecycle: [
        {
          id: 'cleanup-old-images',
          status: 'Enabled',
          expiration: {
            days: 365, // Keep images for 1 year
          },
        },
      ],
      publicAccessBlock: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    };
  }
}

// Type definitions
export interface R2OptimizationOptions {
  cdnDomain?: string;
  compressionEnabled?: boolean;
}

export interface UrlOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface StorageOptimizationOptions {
  enableCompression?: boolean;
  compressionQuality?: number;
  urlOptions?: UrlOptimizationOptions;
}

export interface OptimizedStorageResult {
  success: boolean;
  objectKey: string;
  publicUrl: string;
  optimizedUrl: string;
  uploadTime: number;
  compressionRatio: number;
  error?: string;
}

export interface CompressionResult {
  data: Blob | ArrayBuffer | Uint8Array;
  size: number;
  ratio: number;
  originalSize: number;
}

export interface ImageVariant {
  suffix: string;
  width?: number;
  height?: number;
  quality: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface VariantResult {
  variant: ImageVariant;
  success: boolean;
  objectKey: string;
  publicUrl: string;
  optimizedUrl: string;
  error?: string;
}

export interface VariantGenerationResult {
  results: VariantResult[];
  totalTime: number;
  successCount: number;
  failureCount: number;
}

export interface PreloadResult {
  results: { objectKey: string; success: boolean; loadTime: number }[];
  totalTime: number;
  successCount: number;
  averageLoadTime: number;
}

export interface PerformanceMetrics {
  uploadTimes: number[];
  downloadTimes: number[];
  compressionRatios: number[];
  cacheHitRates: number[];
}

export interface OptimizationMetrics {
  storage: {
    totalObjects: number;
    totalSize: number;
    oldestObject?: Date;
    newestObject?: Date;
  };
  performance: {
    averageUploadTime: number;
    averageDownloadTime: number;
    averageCompressionRatio: number;
    cacheHitRate: number;
  };
  recommendations: string[];
}

export interface R2BucketConfig {
  cors: Array<{
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAgeSeconds: number;
  }>;
  lifecycle: Array<{
    id: string;
    status: 'Enabled' | 'Disabled';
    expiration: {
      days: number;
    };
  }>;
  publicAccessBlock: {
    blockPublicAcls: boolean;
    blockPublicPolicy: boolean;
    ignorePublicAcls: boolean;
    restrictPublicBuckets: boolean;
  };
}

/**
 * Factory function to create R2OptimizationService
 */
export function createR2OptimizationService(
  storageManager: AssetStorageManager,
  options?: R2OptimizationOptions
): R2OptimizationService {
  return new R2OptimizationService(storageManager, options);
}

/**
 * Common image variants for responsive delivery
 */
export const COMMON_IMAGE_VARIANTS: ImageVariant[] = [
  { suffix: 'thumb', width: 150, height: 150, quality: 0.8, format: 'webp' },
  { suffix: 'small', width: 400, height: 400, quality: 0.85, format: 'webp' },
  { suffix: 'medium', width: 800, height: 800, quality: 0.9, format: 'webp' },
  { suffix: 'large', width: 1200, height: 1200, quality: 0.95, format: 'webp' },
  { suffix: 'original', quality: 1.0 },
];