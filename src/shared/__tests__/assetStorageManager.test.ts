import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AssetStorageManager, ImageUtils, createAssetStorageManager } from '../assetStorageManager';
import { ImageMetadata } from '../types';

// Mock R2Bucket
const mockR2Bucket = {
  put: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
});

describe('AssetStorageManager', () => {
  let storageManager: AssetStorageManager;
  let mockImageData: Blob;
  let mockMetadata: ImageMetadata;

  beforeEach(() => {
    vi.clearAllMocks();
    storageManager = new AssetStorageManager(mockR2Bucket as any);
    
    mockImageData = new Blob(['fake image data'], { type: 'image/png' });
    mockMetadata = {
      contentType: 'image/png',
      size: 1024,
      generationParams: {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '01A',
      },
      createdAt: '2025-01-31T10:00:00Z',
      originalFilename: 'test-image.png',
    };
  });

  describe('generatePublicUrl', () => {
    it('should generate correct public URL format', () => {
      const objectKey = 'images/123456789/test-uuid-123.png';
      const publicUrl = storageManager.generatePublicUrl(objectKey);
      
      expect(publicUrl).toBe('https://capitao-caverna-images.r2.cloudflarestorage.com/images/123456789/test-uuid-123.png');
    });
  });

  describe('storeImage', () => {
    it('should store image successfully with correct metadata', async () => {
      mockR2Bucket.put.mockResolvedValue(undefined);
      
      const result = await storageManager.storeImage(mockImageData, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(result.objectKey).toMatch(/^images\/\d+\/test-uuid-123\.png$/);
      expect(result.publicUrl).toContain('capitao-caverna-images.r2.cloudflarestorage.com');
      expect(result.error).toBeUndefined();
      
      expect(mockR2Bucket.put).toHaveBeenCalledWith(
        expect.stringMatching(/^images\/\d+\/test-uuid-123\.png$/),
        mockImageData,
        {
          httpMetadata: {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000',
          },
          customMetadata: {
            'content-type': 'image/png',
            'original-filename': 'test-image.png',
            'size': '1024',
            'created-at': '2025-01-31T10:00:00Z',
            'generation-params': JSON.stringify(mockMetadata.generationParams),
            'pose': 'arms-crossed',
            'outfit': 'hoodie-sweatpants',
            'footwear': 'air-jordan-1-chicago',
            'prop': 'cave-map',
            'frame-type': 'onboarding',
            'frame-id': '01A',
          },
        }
      );
    });

    it('should handle storage errors gracefully', async () => {
      const error = new Error('R2 storage failed');
      mockR2Bucket.put.mockRejectedValue(error);
      
      const result = await storageManager.storeImage(mockImageData, mockMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('R2 storage failed');
      expect(result.objectKey).toBe('');
      expect(result.publicUrl).toBe('');
    });

    it('should handle different image formats', async () => {
      mockR2Bucket.put.mockResolvedValue(undefined);
      
      const jpegMetadata = { ...mockMetadata, contentType: 'image/jpeg' };
      const result = await storageManager.storeImage(mockImageData, jpegMetadata);
      
      expect(result.success).toBe(true);
      expect(result.objectKey).toMatch(/\.jpg$/);
    });

    it('should handle missing optional metadata fields', async () => {
      mockR2Bucket.put.mockResolvedValue(undefined);
      
      const minimalMetadata = {
        ...mockMetadata,
        originalFilename: undefined,
        generationParams: {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
      };
      
      const result = await storageManager.storeImage(mockImageData, minimalMetadata);
      
      expect(result.success).toBe(true);
      expect(mockR2Bucket.put).toHaveBeenCalledWith(
        expect.any(String),
        mockImageData,
        expect.objectContaining({
          customMetadata: expect.objectContaining({
            'original-filename': 'generated-image',
            'prop': '',
            'frame-type': '',
            'frame-id': '',
          }),
        })
      );
    });
  });

  describe('getImage', () => {
    it('should retrieve image successfully', async () => {
      const mockR2Object = { body: mockImageData, key: 'test-key' };
      mockR2Bucket.get.mockResolvedValue(mockR2Object);
      
      const result = await storageManager.getImage('test-key');
      
      expect(result).toBe(mockR2Object);
      expect(mockR2Bucket.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle retrieval errors', async () => {
      mockR2Bucket.get.mockRejectedValue(new Error('Not found'));
      
      const result = await storageManager.getImage('non-existent-key');
      
      expect(result).toBeNull();
    });
  });

  describe('getImageMetadata', () => {
    it('should retrieve metadata successfully', async () => {
      const mockMetadataObject = { key: 'test-key', size: 1024 };
      mockR2Bucket.head.mockResolvedValue(mockMetadataObject);
      
      const result = await storageManager.getImageMetadata('test-key');
      
      expect(result).toBe(mockMetadataObject);
      expect(mockR2Bucket.head).toHaveBeenCalledWith('test-key');
    });

    it('should handle metadata retrieval errors', async () => {
      mockR2Bucket.head.mockRejectedValue(new Error('Not found'));
      
      const result = await storageManager.getImageMetadata('non-existent-key');
      
      expect(result).toBeNull();
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      mockR2Bucket.delete.mockResolvedValue(undefined);
      
      const result = await storageManager.deleteImage('test-key');
      
      expect(result).toBe(true);
      expect(mockR2Bucket.delete).toHaveBeenCalledWith('test-key');
    });

    it('should handle deletion errors', async () => {
      mockR2Bucket.delete.mockRejectedValue(new Error('Delete failed'));
      
      const result = await storageManager.deleteImage('test-key');
      
      expect(result).toBe(false);
    });
  });

  describe('deleteImages', () => {
    it('should delete multiple images successfully', async () => {
      mockR2Bucket.delete.mockResolvedValue(undefined);
      
      const objectKeys = ['key1', 'key2', 'key3'];
      const result = await storageManager.deleteImages(objectKeys);
      
      expect(result.success).toEqual(objectKeys);
      expect(result.failed).toEqual([]);
      expect(mockR2Bucket.delete).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      mockR2Bucket.delete
        .mockResolvedValueOnce(undefined) // key1 succeeds
        .mockRejectedValueOnce(new Error('Delete failed')) // key2 fails
        .mockResolvedValueOnce(undefined); // key3 succeeds
      
      const objectKeys = ['key1', 'key2', 'key3'];
      const result = await storageManager.deleteImages(objectKeys);
      
      expect(result.success).toEqual(['key1', 'key3']);
      expect(result.failed).toEqual(['key2']);
    });
  });

  describe('listImages', () => {
    it('should list images with default options', async () => {
      const mockListing = {
        objects: [
          { key: 'images/1/test1.png', size: 1024 },
          { key: 'images/2/test2.png', size: 2048 },
        ],
        truncated: false,
      };
      mockR2Bucket.list.mockResolvedValue(mockListing);
      
      const result = await storageManager.listImages();
      
      expect(result).toBe(mockListing);
      expect(mockR2Bucket.list).toHaveBeenCalledWith({
        prefix: 'images/',
        limit: 1000,
        cursor: undefined,
      });
    });

    it('should list images with custom options', async () => {
      const mockListing = { objects: [], truncated: false };
      mockR2Bucket.list.mockResolvedValue(mockListing);
      
      await storageManager.listImages({
        prefix: 'images/2025/',
        limit: 100,
        cursor: 'test-cursor',
      });
      
      expect(mockR2Bucket.list).toHaveBeenCalledWith({
        prefix: 'images/2025/',
        limit: 100,
        cursor: 'test-cursor',
      });
    });

    it('should handle listing errors', async () => {
      mockR2Bucket.list.mockRejectedValue(new Error('List failed'));
      
      await expect(storageManager.listImages()).rejects.toThrow('List failed');
    });
  });

  describe('cleanupOldImages', () => {
    it('should cleanup old images successfully', async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const newDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      
      const mockListing = {
        objects: [
          { key: 'images/old1.png', uploaded: oldDate },
          { key: 'images/new1.png', uploaded: newDate },
          { key: 'images/old2.png', uploaded: oldDate },
        ],
        truncated: false,
      };
      
      mockR2Bucket.list.mockResolvedValue(mockListing);
      mockR2Bucket.delete.mockResolvedValue(undefined);
      
      const result = await storageManager.cleanupOldImages(30 * 24 * 60 * 60 * 1000); // 30 days
      
      expect(result.deleted).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockR2Bucket.delete).toHaveBeenCalledTimes(2);
      expect(mockR2Bucket.delete).toHaveBeenCalledWith('images/old1.png');
      expect(mockR2Bucket.delete).toHaveBeenCalledWith('images/old2.png');
    });

    it('should handle cleanup errors', async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      
      const mockListing = {
        objects: [
          { key: 'images/old1.png', uploaded: oldDate },
          { key: 'images/old2.png', uploaded: oldDate },
        ],
        truncated: false,
      };
      
      mockR2Bucket.list.mockResolvedValue(mockListing);
      mockR2Bucket.delete
        .mockResolvedValueOnce(undefined) // first delete succeeds
        .mockRejectedValueOnce(new Error('Delete failed')); // second delete fails
      
      const result = await storageManager.cleanupOldImages(30 * 24 * 60 * 60 * 1000);
      
      expect(result.deleted).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('getStorageStats', () => {
    it('should calculate storage statistics correctly', async () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-15');
      const date3 = new Date('2025-01-30');
      
      const mockListing = {
        objects: [
          { key: 'images/1.png', size: 1024, uploaded: date2 },
          { key: 'images/2.png', size: 2048, uploaded: date1 },
          { key: 'images/3.png', size: 512, uploaded: date3 },
        ],
        truncated: false,
      };
      
      mockR2Bucket.list.mockResolvedValue(mockListing);
      
      const result = await storageManager.getStorageStats();
      
      expect(result.totalObjects).toBe(3);
      expect(result.totalSize).toBe(3584); // 1024 + 2048 + 512
      expect(result.oldestObject).toEqual(date1);
      expect(result.newestObject).toEqual(date3);
    });

    it('should handle empty storage', async () => {
      const mockListing = { objects: [], truncated: false };
      mockR2Bucket.list.mockResolvedValue(mockListing);
      
      const result = await storageManager.getStorageStats();
      
      expect(result.totalObjects).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.oldestObject).toBeUndefined();
      expect(result.newestObject).toBeUndefined();
    });
  });

  describe('storeImageWithValidation', () => {
    it('should validate and store image successfully', async () => {
      mockR2Bucket.put.mockResolvedValue(undefined);
      
      const result = await storageManager.storeImageWithValidation(mockImageData, mockMetadata);
      
      expect(result.success).toBe(true);
      expect(mockR2Bucket.put).toHaveBeenCalled();
    });

    it('should reject oversized images', async () => {
      const oversizedMetadata = { ...mockMetadata, size: 15 * 1024 * 1024 }; // 15MB
      
      const result = await storageManager.storeImageWithValidation(mockImageData, oversizedMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(mockR2Bucket.put).not.toHaveBeenCalled();
    });

    it('should reject unsupported content types', async () => {
      const invalidMetadata = { ...mockMetadata, contentType: 'image/bmp' };
      
      const result = await storageManager.storeImageWithValidation(mockImageData, invalidMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported content type');
      expect(mockR2Bucket.put).not.toHaveBeenCalled();
    });

    it('should reject missing required generation parameters', async () => {
      const invalidMetadata = {
        ...mockMetadata,
        generationParams: {
          pose: '',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
        },
      };
      
      const result = await storageManager.storeImageWithValidation(mockImageData, invalidMetadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required generation parameters');
      expect(mockR2Bucket.put).not.toHaveBeenCalled();
    });
  });
});

describe('createAssetStorageManager', () => {
  it('should create AssetStorageManager instance', () => {
    const env = { IMAGE_BUCKET: mockR2Bucket as any };
    const manager = createAssetStorageManager(env);
    
    expect(manager).toBeInstanceOf(AssetStorageManager);
  });
});

describe('ImageUtils', () => {
  describe('responseToBlob', () => {
    it('should convert Response to Blob', async () => {
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(new Blob(['test'])),
      } as any;
      
      const result = await ImageUtils.responseToBlob(mockResponse);
      
      expect(result).toBeInstanceOf(Blob);
      expect(mockResponse.blob).toHaveBeenCalled();
    });
  });

  describe('arrayBufferToBlob', () => {
    it('should convert ArrayBuffer to Blob', () => {
      const buffer = new ArrayBuffer(8);
      const contentType = 'image/png';
      
      const result = ImageUtils.arrayBufferToBlob(buffer, contentType);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe(contentType);
    });
  });

  describe('getImageDimensions', () => {
    it('should extract PNG dimensions', async () => {
      // Create a minimal PNG header with dimensions 100x200
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x64, // width: 100
        0x00, 0x00, 0x00, 0xC8, // height: 200
        // ... rest of header would go here
      ]);
      
      const blob = new Blob([pngHeader], { type: 'image/png' });
      const result = await ImageUtils.getImageDimensions(blob);
      
      expect(result).toEqual({ width: 100, height: 200 });
    });

    it('should return null for unsupported formats', async () => {
      const blob = new Blob(['not an image'], { type: 'text/plain' });
      const result = await ImageUtils.getImageDimensions(blob);
      
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const blob = new Blob([new Uint8Array(4)], { type: 'image/png' }); // Too small
      const result = await ImageUtils.getImageDimensions(blob);
      
      expect(result).toBeNull();
    });
  });

  describe('generateThumbnailKey', () => {
    it('should generate thumbnail key with default size', () => {
      const originalKey = 'images/123/test.png';
      const result = ImageUtils.generateThumbnailKey(originalKey);
      
      expect(result).toBe('images/123/test_thumb_150x150.png');
    });

    it('should generate thumbnail key with custom size', () => {
      const originalKey = 'images/123/test.jpg';
      const result = ImageUtils.generateThumbnailKey(originalKey, '300x300');
      
      expect(result).toBe('images/123/test_thumb_300x300.jpg');
    });

    it('should handle keys with multiple dots', () => {
      const originalKey = 'images/test.file.name.png';
      const result = ImageUtils.generateThumbnailKey(originalKey);
      
      expect(result).toBe('images/test.file.name_thumb_150x150.png');
    });
  });
});