import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { AssetStorageManager } from '../assetStorageManager';
import { R2OptimizationService, COMMON_IMAGE_VARIANTS } from '../r2OptimizationService';
import { ImageMetadata } from '../types';

/**
 * Performance Tests for R2 Storage and Optimization
 * These tests measure actual performance characteristics and validate
 * optimization features for zero egress fees and global delivery
 */

// Mock R2Bucket for performance testing
const createMockR2Bucket = () => ({
  put: vi.fn().mockImplementation(async (key: string, data: any) => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    return { key, size: data.size || 1024 };
  }),
  get: vi.fn().mockImplementation(async (key: string) => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
    return { 
      key, 
      body: new Blob(['mock data'], { type: 'image/png' }),
      size: 1024,
      uploaded: new Date()
    };
  }),
  head: vi.fn().mockImplementation(async (key: string) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    return { key, size: 1024, uploaded: new Date() };
  }),
  delete: vi.fn().mockImplementation(async (key: string) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 20));
    return true;
  }),
  list: vi.fn().mockImplementation(async (options: any) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 60 + 30));
    const objects = Array.from({ length: options.limit || 10 }, (_, i) => ({
      key: `images/${Date.now()}-${i}.png`,
      size: Math.floor(Math.random() * 5000) + 1000,
      uploaded: new Date(Date.now() - Math.random() * 86400000), // Random date within last day
    }));
    return { objects, truncated: false };
  }),
});

describe('R2 Performance Tests', () => {
  let storageManager: AssetStorageManager;
  let optimizationService: R2OptimizationService;
  let mockR2Bucket: any;

  beforeAll(() => {
    // Set longer timeout for performance tests
    vi.setConfig({ testTimeout: 30000 });
  });

  beforeEach(() => {
    mockR2Bucket = createMockR2Bucket();
    storageManager = new AssetStorageManager(mockR2Bucket);
    optimizationService = new R2OptimizationService(storageManager, {
      cdnDomain: 'images.example.com',
      compressionEnabled: true,
    });
  });

  afterAll(() => {
    // Cleanup after performance tests
    vi.clearAllMocks();
  });

  describe('Upload Performance', () => {
    it('should upload images within acceptable time limits', async () => {
      const imageData = new Blob(['test image data'.repeat(100)], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      const startTime = performance.now();
      const result = await storageManager.storeImage(imageData, metadata);
      const uploadTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(uploadTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Upload time: ${uploadTime.toFixed(2)}ms`);
    });

    it('should handle concurrent uploads efficiently', async () => {
      const concurrentUploads = 5;
      const imageData = new Blob(['test data'], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      const startTime = performance.now();
      const uploadPromises = Array.from({ length: concurrentUploads }, () =>
        storageManager.storeImage(imageData, metadata)
      );

      const results = await Promise.all(uploadPromises);
      const totalTime = performance.now() - startTime;

      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(10000); // All uploads within 10 seconds
      
      const averageTime = totalTime / concurrentUploads;
      console.log(`Concurrent uploads (${concurrentUploads}): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    it('should demonstrate compression performance benefits', async () => {
      const largeImageData = new Blob(['large image data'.repeat(1000)], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: largeImageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      // Test with compression
      const startTimeCompressed = performance.now();
      const compressedResult = await optimizationService.storeOptimizedImage(
        largeImageData,
        metadata,
        { enableCompression: true, compressionQuality: 0.8 }
      );
      const compressedTime = performance.now() - startTimeCompressed;

      // Test without compression
      const startTimeUncompressed = performance.now();
      const uncompressedResult = await optimizationService.storeOptimizedImage(
        largeImageData,
        metadata,
        { enableCompression: false }
      );
      const uncompressedTime = performance.now() - startTimeUncompressed;

      expect(compressedResult.success).toBe(true);
      expect(uncompressedResult.success).toBe(true);
      expect(compressedResult.compressionRatio).toBeGreaterThan(1);
      expect(uncompressedResult.compressionRatio).toBe(1);

      console.log(`Compression performance:`);
      console.log(`  Compressed: ${compressedTime.toFixed(2)}ms, ratio: ${compressedResult.compressionRatio.toFixed(2)}`);
      console.log(`  Uncompressed: ${uncompressedTime.toFixed(2)}ms`);
    });
  });

  describe('Download Performance', () => {
    it('should retrieve images within acceptable time limits', async () => {
      const objectKey = 'images/test-image.png';
      
      const startTime = performance.now();
      const result = await storageManager.getImage(objectKey);
      const downloadTime = performance.now() - startTime;

      expect(result).toBeTruthy();
      expect(downloadTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Download time: ${downloadTime.toFixed(2)}ms`);
    });

    it('should handle concurrent downloads efficiently', async () => {
      const concurrentDownloads = 10;
      const objectKeys = Array.from({ length: concurrentDownloads }, (_, i) => `images/test-${i}.png`);

      const startTime = performance.now();
      const downloadPromises = objectKeys.map(key => storageManager.getImage(key));
      const results = await Promise.all(downloadPromises);
      const totalTime = performance.now() - startTime;

      expect(results.every(r => r !== null)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // All downloads within 5 seconds
      
      const averageTime = totalTime / concurrentDownloads;
      console.log(`Concurrent downloads (${concurrentDownloads}): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    it('should demonstrate metadata retrieval performance', async () => {
      const objectKeys = Array.from({ length: 20 }, (_, i) => `images/metadata-test-${i}.png`);

      const startTime = performance.now();
      const metadataPromises = objectKeys.map(key => storageManager.getImageMetadata(key));
      const results = await Promise.all(metadataPromises);
      const totalTime = performance.now() - startTime;

      expect(results.every(r => r !== null)).toBe(true);
      expect(totalTime).toBeLessThan(3000); // Metadata retrieval should be fast
      
      const averageTime = totalTime / objectKeys.length;
      console.log(`Metadata retrieval (${objectKeys.length} items): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk listing efficiently', async () => {
      const startTime = performance.now();
      const result = await storageManager.listImages({ limit: 100 });
      const listTime = performance.now() - startTime;

      expect(result.objects).toBeDefined();
      expect(listTime).toBeLessThan(3000); // Listing should complete within 3 seconds
      
      console.log(`Bulk listing (100 items): ${listTime.toFixed(2)}ms`);
    });

    it('should handle bulk deletion efficiently', async () => {
      const objectKeys = Array.from({ length: 10 }, (_, i) => `images/bulk-delete-${i}.png`);

      const startTime = performance.now();
      const result = await storageManager.deleteImages(objectKeys);
      const deleteTime = performance.now() - startTime;

      expect(result.success.length + result.failed.length).toBe(objectKeys.length);
      expect(deleteTime).toBeLessThan(5000); // Bulk deletion within 5 seconds
      
      console.log(`Bulk deletion (${objectKeys.length} items): ${deleteTime.toFixed(2)}ms`);
    });

    it('should demonstrate cleanup performance', async () => {
      const startTime = performance.now();
      const result = await storageManager.cleanupOldImages(7 * 24 * 60 * 60 * 1000); // 7 days
      const cleanupTime = performance.now() - startTime;

      expect(result.deleted).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeGreaterThanOrEqual(0);
      expect(cleanupTime).toBeLessThan(10000); // Cleanup within 10 seconds
      
      console.log(`Cleanup operation: ${cleanupTime.toFixed(2)}ms, deleted: ${result.deleted}, errors: ${result.errors}`);
    });
  });

  describe('Image Variant Generation Performance', () => {
    it('should generate image variants efficiently', async () => {
      const imageData = new Blob(['test image data'], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      const variants = COMMON_IMAGE_VARIANTS.slice(0, 3); // Test with first 3 variants

      const startTime = performance.now();
      const result = await optimizationService.generateImageVariants(imageData, metadata, variants);
      const variantTime = performance.now() - startTime;

      expect(result.successCount).toBe(variants.length);
      expect(result.failureCount).toBe(0);
      expect(variantTime).toBeLessThan(8000); // Variant generation within 8 seconds
      
      console.log(`Variant generation (${variants.length} variants): ${variantTime.toFixed(2)}ms`);
    });

    it('should handle large variant generation efficiently', async () => {
      const imageData = new Blob(['large image data'.repeat(100)], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      const startTime = performance.now();
      const result = await optimizationService.generateImageVariants(imageData, metadata, COMMON_IMAGE_VARIANTS);
      const variantTime = performance.now() - startTime;

      expect(result.successCount).toBe(COMMON_IMAGE_VARIANTS.length);
      expect(variantTime).toBeLessThan(15000); // All variants within 15 seconds
      
      const averageTimePerVariant = variantTime / COMMON_IMAGE_VARIANTS.length;
      console.log(`Full variant generation: ${variantTime.toFixed(2)}ms total, ${averageTimePerVariant.toFixed(2)}ms per variant`);
    });
  });

  describe('Preloading Performance', () => {
    it('should preload images efficiently', async () => {
      const objectKeys = Array.from({ length: 15 }, (_, i) => `images/preload-${i}.png`);

      const startTime = performance.now();
      const result = await optimizationService.preloadImages(objectKeys);
      const preloadTime = performance.now() - startTime;

      expect(result.results.length).toBe(objectKeys.length);
      expect(result.averageLoadTime).toBeGreaterThan(0);
      expect(preloadTime).toBeLessThan(8000); // Preloading within 8 seconds
      
      console.log(`Preloading (${objectKeys.length} images): ${preloadTime.toFixed(2)}ms total, ${result.averageLoadTime.toFixed(2)}ms average`);
    });
  });

  describe('Storage Analytics Performance', () => {
    it('should generate storage statistics efficiently', async () => {
      const startTime = performance.now();
      const stats = await storageManager.getStorageStats();
      const statsTime = performance.now() - startTime;

      expect(stats.totalObjects).toBeGreaterThanOrEqual(0);
      expect(stats.totalSize).toBeGreaterThanOrEqual(0);
      expect(statsTime).toBeLessThan(5000); // Statistics generation within 5 seconds
      
      console.log(`Storage statistics: ${statsTime.toFixed(2)}ms, ${stats.totalObjects} objects, ${(stats.totalSize / 1024).toFixed(2)}KB total`);
    });

    it('should generate optimization metrics efficiently', async () => {
      // Generate some performance data first
      const imageData = new Blob(['test data'], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      // Perform some operations to generate metrics
      await optimizationService.storeOptimizedImage(imageData, metadata);
      await optimizationService.preloadImages(['test1.png', 'test2.png']);

      const startTime = performance.now();
      const metrics = await optimizationService.getOptimizationMetrics();
      const metricsTime = performance.now() - startTime;

      expect(metrics.storage).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.recommendations).toBeInstanceOf(Array);
      expect(metricsTime).toBeLessThan(3000); // Metrics generation within 3 seconds
      
      console.log(`Optimization metrics: ${metricsTime.toFixed(2)}ms`);
      console.log(`  Recommendations: ${metrics.recommendations.length}`);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty operations efficiently', async () => {
      const startTime = performance.now();
      
      // Test empty list
      const emptyList = await storageManager.listImages({ limit: 0 });
      
      // Test empty bulk delete
      const emptyDelete = await storageManager.deleteImages([]);
      
      // Test empty preload
      const emptyPreload = await optimizationService.preloadImages([]);
      
      const totalTime = performance.now() - startTime;

      expect(emptyList.objects).toBeDefined();
      expect(emptyDelete.success).toEqual([]);
      expect(emptyDelete.failed).toEqual([]);
      expect(emptyPreload.results).toEqual([]);
      expect(totalTime).toBeLessThan(1000); // Empty operations should be very fast
      
      console.log(`Empty operations: ${totalTime.toFixed(2)}ms`);
    });

    it('should handle error scenarios gracefully', async () => {
      // Mock errors for specific operations
      mockR2Bucket.get.mockRejectedValueOnce(new Error('Network error'));
      mockR2Bucket.put.mockRejectedValueOnce(new Error('Storage full'));

      const imageData = new Blob(['test data'], { type: 'image/png' });
      const metadata: ImageMetadata = {
        contentType: 'image/png',
        size: imageData.size,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
        createdAt: new Date().toISOString(),
      };

      const startTime = performance.now();
      
      // These should handle errors gracefully
      const getResult = await storageManager.getImage('non-existent.png');
      const storeResult = await storageManager.storeImage(imageData, metadata);
      
      const errorHandlingTime = performance.now() - startTime;

      expect(getResult).toBeNull();
      expect(storeResult.success).toBe(false);
      expect(errorHandlingTime).toBeLessThan(2000); // Error handling should be fast
      
      console.log(`Error handling: ${errorHandlingTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large datasets without memory issues', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate processing many images
      const operations = [];
      for (let i = 0; i < 50; i++) {
        const imageData = new Blob([`image data ${i}`.repeat(10)], { type: 'image/png' });
        const metadata: ImageMetadata = {
          contentType: 'image/png',
          size: imageData.size,
          generationParams: {
            pose: 'arms-crossed',
            outfit: 'hoodie-sweatpants',
            footwear: 'air-jordan-1-chicago',
          },
          createdAt: new Date().toISOString(),
        };
        
        operations.push(storageManager.storeImage(imageData, metadata));
      }

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const processingTime = performance.now() - startTime;
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(results.every(r => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(20000); // Large dataset processing within 20 seconds
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Memory increase should be reasonable (< 50MB)
      
      console.log(`Large dataset processing (50 images): ${processingTime.toFixed(2)}ms`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});