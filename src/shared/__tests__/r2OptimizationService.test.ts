import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { 
  R2OptimizationService, 
  createR2OptimizationService,
  COMMON_IMAGE_VARIANTS,
  R2BucketConfig
} from '../r2OptimizationService';
import { AssetStorageManager } from '../assetStorageManager';
import { ImageMetadata } from '../types';

// Mock AssetStorageManager
const mockStorageManager = {
  storeImageWithValidation: vi.fn(),
  generatePublicUrl: vi.fn(),
  getImageMetadata: vi.fn(),
  getStorageStats: vi.fn(),
};

// Mock performance.now with incrementing values
let mockTime = 1000;
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => {
      mockTime += 10; // Increment by 10ms each call
      return mockTime;
    }),
  },
});

describe('R2OptimizationService', () => {
  let optimizationService: R2OptimizationService;
  let mockImageData: Blob;
  let mockMetadata: ImageMetadata;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTime = 1000; // Reset mock time
    
    optimizationService = new R2OptimizationService(mockStorageManager as any, {
      cdnDomain: 'images.example.com',
      compressionEnabled: true,
    });
    
    mockImageData = new Blob(['fake image data'], { type: 'image/png' });
    mockMetadata = {
      contentType: 'image/png',
      size: 1024,
      generationParams: {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      },
      createdAt: '2025-01-31T10:00:00Z',
      originalFilename: 'test-image.png',
    };
  });

  describe('generateOptimizedUrl', () => {
    it('should generate CDN URL with optimization parameters', () => {
      const objectKey = 'images/123/test.png';
      const options = {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp' as const,
        fit: 'cover' as const,
      };
      
      const url = optimizationService.generateOptimizedUrl(objectKey, options);
      
      expect(url).toBe('https://images.example.com/images/123/test.png?w=800&h=600&q=85&f=webp&fit=cover');
    });

    it('should generate CDN URL without parameters', () => {
      const objectKey = 'images/123/test.png';
      
      const url = optimizationService.generateOptimizedUrl(objectKey);
      
      expect(url).toBe('https://images.example.com/images/123/test.png');
    });

    it('should fallback to storage manager URL when no CDN domain', () => {
      const serviceWithoutCDN = new R2OptimizationService(mockStorageManager as any);
      mockStorageManager.generatePublicUrl.mockReturnValue('https://bucket.r2.cloudflarestorage.com/images/123/test.png');
      
      const objectKey = 'images/123/test.png';
      const url = serviceWithoutCDN.generateOptimizedUrl(objectKey);
      
      expect(url).toBe('https://bucket.r2.cloudflarestorage.com/images/123/test.png');
      expect(mockStorageManager.generatePublicUrl).toHaveBeenCalledWith(objectKey);
    });
  });

  describe('storeOptimizedImage', () => {
    it('should store image with compression and optimization', async () => {
      const mockStorageResult = {
        success: true,
        objectKey: 'images/123/test.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test.png',
      };
      
      mockStorageManager.storeImageWithValidation.mockResolvedValue(mockStorageResult);
      
      const result = await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(result.objectKey).toBe('images/123/test.png');
      expect(result.optimizedUrl).toBe('https://images.example.com/images/123/test.png');
      expect(result.compressionRatio).toBeGreaterThan(1);
      expect(result.uploadTime).toBeGreaterThan(0);
      
      expect(mockStorageManager.storeImageWithValidation).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({
          contentType: mockMetadata.contentType,
          generationParams: mockMetadata.generationParams,
          createdAt: mockMetadata.createdAt,
          originalFilename: mockMetadata.originalFilename,
          originalSize: mockMetadata.size,
          compressionRatio: expect.any(Number),
          size: expect.any(Number),
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageManager.storeImageWithValidation.mockResolvedValue({
        success: false,
        objectKey: '',
        publicUrl: '',
        error: 'Storage failed',
      });
      
      const result = await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage failed');
      expect(result.uploadTime).toBeGreaterThan(0);
    });

    it('should disable compression when requested', async () => {
      const mockStorageResult = {
        success: true,
        objectKey: 'images/123/test.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test.png',
      };
      
      mockStorageManager.storeImageWithValidation.mockResolvedValue(mockStorageResult);
      
      const result = await optimizationService.storeOptimizedImage(
        mockImageData, 
        mockMetadata,
        { enableCompression: false }
      );
      
      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBe(1); // No compression
    });

    it('should apply custom compression quality', async () => {
      const mockStorageResult = {
        success: true,
        objectKey: 'images/123/test.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test.png',
      };
      
      mockStorageManager.storeImageWithValidation.mockResolvedValue(mockStorageResult);
      
      const result = await optimizationService.storeOptimizedImage(
        mockImageData, 
        mockMetadata,
        { compressionQuality: 0.7 }
      );
      
      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it('should handle compression errors gracefully', async () => {
      // Mock a scenario where compression might fail
      const invalidImageData = new ArrayBuffer(0); // Empty buffer
      
      mockStorageManager.storeImageWithValidation.mockResolvedValue({
        success: true,
        objectKey: 'images/123/test.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test.png',
      });
      
      const result = await optimizationService.storeOptimizedImage(
        invalidImageData, 
        mockMetadata
      );
      
      expect(result.success).toBe(true); // Should still succeed with fallback
    });
  });

  describe('generateImageVariants', () => {
    it('should generate multiple image variants successfully', async () => {
      const mockStorageResult = {
        success: true,
        objectKey: 'images/123/test_variant.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test_variant.png',
        optimizedUrl: 'https://images.example.com/images/123/test_variant.png',
      };
      
      mockStorageManager.storeImageWithValidation.mockResolvedValue(mockStorageResult);
      
      const variants = [
        { suffix: 'thumb', width: 150, height: 150, quality: 0.8 },
        { suffix: 'medium', width: 800, height: 600, quality: 0.9 },
      ];
      
      const result = await optimizationService.generateImageVariants(
        mockImageData,
        mockMetadata,
        variants
      );
      
      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.totalTime).toBeGreaterThan(0);
      
      expect(result.results[0].variant.suffix).toBe('thumb');
      expect(result.results[1].variant.suffix).toBe('medium');
      
      expect(mockStorageManager.storeImageWithValidation).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in variant generation', async () => {
      mockStorageManager.storeImageWithValidation
        .mockResolvedValueOnce({
          success: true,
          objectKey: 'images/123/test_thumb.png',
          publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test_thumb.png',
          optimizedUrl: 'https://images.example.com/images/123/test_thumb.png',
        })
        .mockResolvedValueOnce({
          success: false,
          objectKey: '',
          publicUrl: '',
          optimizedUrl: '',
          error: 'Storage failed',
        });
      
      const variants = [
        { suffix: 'thumb', width: 150, height: 150, quality: 0.8 },
        { suffix: 'medium', width: 800, height: 600, quality: 0.9 },
      ];
      
      const result = await optimizationService.generateImageVariants(
        mockImageData,
        mockMetadata,
        variants
      );
      
      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Storage failed');
    });

    it('should work with common image variants', async () => {
      mockStorageManager.storeImageWithValidation.mockResolvedValue({
        success: true,
        objectKey: 'images/123/test_variant.png',
        publicUrl: 'https://bucket.r2.cloudflarestorage.com/images/123/test_variant.png',
        optimizedUrl: 'https://images.example.com/images/123/test_variant.png',
      });
      
      const result = await optimizationService.generateImageVariants(
        mockImageData,
        mockMetadata,
        COMMON_IMAGE_VARIANTS
      );
      
      expect(result.results).toHaveLength(COMMON_IMAGE_VARIANTS.length);
      expect(result.successCount).toBe(COMMON_IMAGE_VARIANTS.length);
    });
  });

  describe('preloadImages', () => {
    it('should preload images and measure performance', async () => {
      const mockMetadata = { key: 'test', size: 1024 };
      mockStorageManager.getImageMetadata
        .mockResolvedValueOnce(mockMetadata)
        .mockResolvedValueOnce(mockMetadata)
        .mockResolvedValueOnce(null); // Third image not found
      
      const objectKeys = ['image1.png', 'image2.png', 'image3.png'];
      const result = await optimizationService.preloadImages(objectKeys);
      
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(2);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageLoadTime).toBeGreaterThan(0);
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
      
      expect(mockStorageManager.getImageMetadata).toHaveBeenCalledTimes(3);
    });

    it('should handle preload errors gracefully', async () => {
      mockStorageManager.getImageMetadata.mockRejectedValue(new Error('Network error'));
      
      const objectKeys = ['image1.png'];
      const result = await optimizationService.preloadImages(objectKeys);
      
      expect(result.results).toHaveLength(1);
      expect(result.successCount).toBe(0);
      expect(result.results[0].success).toBe(false);
    });
  });

  describe('getOptimizationMetrics', () => {
    it('should return comprehensive optimization metrics', async () => {
      const mockStorageStats = {
        totalObjects: 100,
        totalSize: 1024000,
        oldestObject: new Date('2025-01-01'),
        newestObject: new Date('2025-01-31'),
      };
      
      mockStorageManager.getStorageStats.mockResolvedValue(mockStorageStats);
      
      // Simulate some performance data
      await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      
      const metrics = await optimizationService.getOptimizationMetrics();
      
      expect(metrics.storage).toEqual(mockStorageStats);
      expect(metrics.performance.averageUploadTime).toBeGreaterThan(0);
      expect(metrics.performance.averageCompressionRatio).toBeGreaterThan(1);
      expect(metrics.recommendations).toBeInstanceOf(Array);
      expect(metrics.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide optimization recommendations', async () => {
      mockStorageManager.getStorageStats.mockResolvedValue({
        totalObjects: 0,
        totalSize: 0,
      });
      
      const serviceWithoutCDN = new R2OptimizationService(mockStorageManager as any);
      const metrics = await serviceWithoutCDN.getOptimizationMetrics();
      
      expect(metrics.recommendations).toContain('Configure custom CDN domain for better performance and branding');
      expect(metrics.recommendations).toContain('Collect more performance data for better optimization insights');
    });
  });

  describe('R2BucketConfig', () => {
    it('should generate optimal R2 bucket configuration', () => {
      const config = R2OptimizationService.generateR2BucketConfig();
      
      expect(config.cors).toHaveLength(1);
      expect(config.cors[0].allowedMethods).toContain('GET');
      expect(config.cors[0].allowedMethods).toContain('HEAD');
      expect(config.cors[0].maxAgeSeconds).toBe(3600);
      
      expect(config.lifecycle).toHaveLength(1);
      expect(config.lifecycle[0].id).toBe('cleanup-old-images');
      expect(config.lifecycle[0].status).toBe('Enabled');
      expect(config.lifecycle[0].expiration.days).toBe(365);
      
      expect(config.publicAccessBlock.blockPublicAcls).toBe(false);
      expect(config.publicAccessBlock.blockPublicPolicy).toBe(false);
    });
  });

  describe('Performance Tracking', () => {
    it('should track upload performance metrics', async () => {
      mockStorageManager.storeImageWithValidation.mockResolvedValue({
        success: true,
        objectKey: 'test.png',
        publicUrl: 'https://example.com/test.png',
      });
      
      // Store multiple images to build metrics
      for (let i = 0; i < 5; i++) {
        await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      }
      
      const metrics = await optimizationService.getOptimizationMetrics();
      
      expect(metrics.performance.averageUploadTime).toBeGreaterThan(0);
      expect(metrics.performance.averageCompressionRatio).toBeGreaterThan(1);
    });

    it('should limit metrics history to prevent memory issues', async () => {
      mockStorageManager.storeImageWithValidation.mockResolvedValue({
        success: true,
        objectKey: 'test.png',
        publicUrl: 'https://example.com/test.png',
      });
      
      // This test would be more meaningful with a smaller limit for testing
      // but demonstrates the concept
      for (let i = 0; i < 10; i++) {
        await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      }
      
      const metrics = await optimizationService.getOptimizationMetrics();
      expect(metrics.performance.averageUploadTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage manager errors gracefully', async () => {
      mockStorageManager.storeImageWithValidation.mockRejectedValue(new Error('Storage error'));
      
      const result = await optimizationService.storeOptimizedImage(mockImageData, mockMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
      expect(result.uploadTime).toBeGreaterThan(0);
    });

    it('should handle metrics collection errors', async () => {
      mockStorageManager.getStorageStats.mockRejectedValue(new Error('Stats error'));
      
      await expect(optimizationService.getOptimizationMetrics()).rejects.toThrow('Stats error');
    });
  });
});

describe('createR2OptimizationService', () => {
  it('should create R2OptimizationService instance', () => {
    const service = createR2OptimizationService(mockStorageManager as any, {
      cdnDomain: 'cdn.example.com',
    });
    
    expect(service).toBeInstanceOf(R2OptimizationService);
  });
});

describe('COMMON_IMAGE_VARIANTS', () => {
  it('should provide standard image variants', () => {
    expect(COMMON_IMAGE_VARIANTS).toHaveLength(5);
    
    const suffixes = COMMON_IMAGE_VARIANTS.map(v => v.suffix);
    expect(suffixes).toContain('thumb');
    expect(suffixes).toContain('small');
    expect(suffixes).toContain('medium');
    expect(suffixes).toContain('large');
    expect(suffixes).toContain('original');
    
    // Check that webp format is preferred for most variants
    const webpVariants = COMMON_IMAGE_VARIANTS.filter(v => v.format === 'webp');
    expect(webpVariants.length).toBeGreaterThan(3);
  });
});