import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeneratedImagesService } from '../generatedImagesService';
import { GeneratedImageRecord, ImageGenerationParams } from '../types';
import { DatabaseError } from '../database';

// Mock D1Database interface
const createMockD1Database = () => ({
  prepare: vi.fn(),
  batch: vi.fn(),
  dump: vi.fn(),
  exec: vi.fn()
});

// Mock D1PreparedStatement
const createMockPreparedStatement = () => ({
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
  first: vi.fn(),
  all: vi.fn()
});

describe('GeneratedImagesService', () => {
  let mockDb: any;
  let mockStmt: any;
  let service: GeneratedImagesService;

  const mockImageRecord: Omit<GeneratedImageRecord, 'created_at'> = {
    image_id: 'test-image-123',
    user_id: 'user-456',
    r2_object_key: 'images/test-image-123.jpg',
    prompt_parameters: JSON.stringify({
      pose: 'arms-crossed',
      outfit: 'hoodie-sweatpants',
      footwear: 'air-jordan-1-chicago',
      prop: 'cave-map'
    }),
    status: 'PENDING',
    error_message: null,
    generation_time_ms: null,
    service_used: null,
    public_url: null
  };

  const mockCompleteImageRecord: GeneratedImageRecord = {
    ...mockImageRecord,
    created_at: '2024-01-01T12:00:00.000Z',
    status: 'COMPLETE',
    generation_time_ms: 5000,
    service_used: 'midjourney',
    public_url: 'https://r2.example.com/images/test-image-123.jpg'
  };

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement();
    mockDb.prepare.mockReturnValue(mockStmt);
    service = new GeneratedImagesService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('insertGeneratedImage', () => {
    it('should insert a new generated image record successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.insertGeneratedImage(mockImageRecord);

      expect(result).toBe(mockImageRecord.image_id);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO GeneratedImages'));
      expect(mockStmt.bind).toHaveBeenCalledWith(
        mockImageRecord.image_id,
        mockImageRecord.user_id,
        mockImageRecord.r2_object_key,
        mockImageRecord.prompt_parameters,
        mockImageRecord.status,
        mockImageRecord.error_message,
        mockImageRecord.generation_time_ms,
        mockImageRecord.service_used,
        mockImageRecord.public_url
      );
    });

    it('should handle insert failures', async () => {
      mockStmt.run.mockResolvedValue({ success: false });

      await expect(service.insertGeneratedImage(mockImageRecord)).rejects.toThrow(DatabaseError);
    });

    it('should handle database errors during insert', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.insertGeneratedImage(mockImageRecord)).rejects.toThrow(DatabaseError);
    });

    it('should validate record structure before insert', async () => {
      const invalidRecord = { ...mockImageRecord, status: 'INVALID_STATUS' as any };

      await expect(service.insertGeneratedImage(invalidRecord)).rejects.toThrow();
    });
  });

  describe('getGeneratedImageById', () => {
    it('should return image record when found', async () => {
      mockStmt.first.mockResolvedValue(mockCompleteImageRecord);

      const result = await service.getGeneratedImageById('test-image-123');

      expect(result).toEqual(mockCompleteImageRecord);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(mockStmt.bind).toHaveBeenCalledWith('test-image-123');
    });

    it('should return null when image not found', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.getGeneratedImageById('nonexistent-image');

      expect(result).toBeNull();
    });

    it('should handle database errors during get', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getGeneratedImageById('test-image-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateImageStatus', () => {
    it('should update image status successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.updateImageStatus(
        'test-image-123',
        'COMPLETE',
        undefined,
        5000,
        'https://r2.example.com/image.jpg'
      );

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'COMPLETE',
        null,
        5000,
        'https://r2.example.com/image.jpg',
        'test-image-123'
      );
    });

    it('should return false when no rows updated', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 0 });

      const result = await service.updateImageStatus('nonexistent-image', 'COMPLETE');

      expect(result).toBe(false);
    });

    it('should handle update with error message', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.updateImageStatus(
        'test-image-123',
        'FAILED',
        'Generation timeout'
      );

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'FAILED',
        'Generation timeout',
        null,
        null,
        'test-image-123'
      );
    });

    it('should handle database errors during update', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.updateImageStatus('test-image-123', 'COMPLETE')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getUserImages', () => {
    it('should return user images with default pagination', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getUserImages('user-456');

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 50, 0);
    });

    it('should return user images with custom pagination', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getUserImages('user-456', 10, 20);

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 10, 20);
    });

    it('should filter by status when provided', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getUserImages('user-456', 50, 0, 'COMPLETE');

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'COMPLETE', 50, 0);
    });

    it('should handle database errors during getUserImages', async () => {
      mockStmt.all.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserImages('user-456')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getUserImageCount', () => {
    it('should return user image count', async () => {
      mockStmt.first.mockResolvedValue({ count: 5 });

      const result = await service.getUserImageCount('user-456');

      expect(result).toBe(5);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456');
    });

    it('should return count with status filter', async () => {
      mockStmt.first.mockResolvedValue({ count: 3 });

      const result = await service.getUserImageCount('user-456', 'COMPLETE');

      expect(result).toBe(3);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'COMPLETE');
    });

    it('should return 0 when count is null', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.getUserImageCount('user-456');

      expect(result).toBe(0);
    });

    it('should handle database errors during count', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserImageCount('user-456')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getImageByParameters', () => {
    it('should find image by parameters', async () => {
      mockStmt.first.mockResolvedValue(mockCompleteImageRecord);

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map'
      };

      const result = await service.getImageByParameters('user-456', params);

      expect(result).toEqual(mockCompleteImageRecord);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', JSON.stringify(params));
    });

    it('should return null when no matching image found', async () => {
      mockStmt.first.mockResolvedValue(null);

      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const result = await service.getImageByParameters('user-456', params);

      expect(result).toBeNull();
    });

    it('should handle database errors during parameter search', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      await expect(service.getImageByParameters('user-456', params)).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteGeneratedImage', () => {
    it('should delete image successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.deleteGeneratedImage('test-image-123');

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('test-image-123');
    });

    it('should delete image with user check', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.deleteGeneratedImage('test-image-123', 'user-456');

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('test-image-123', 'user-456');
    });

    it('should return false when no rows deleted', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 0 });

      const result = await service.deleteGeneratedImage('nonexistent-image');

      expect(result).toBe(false);
    });

    it('should handle database errors during delete', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteGeneratedImage('test-image-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getImagesByService', () => {
    it('should return images by service', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getImagesByService('midjourney');

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('midjourney', 100);
    });

    it('should return images with custom limit', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getImagesByService('dalle', 50);

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('dalle', 50);
    });

    it('should handle database errors during service query', async () => {
      mockStmt.all.mockRejectedValue(new Error('Database error'));

      await expect(service.getImagesByService('midjourney')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getGenerationStats', () => {
    it('should return generation statistics', async () => {
      const mockCountResult = {
        total: 10,
        completed: 7,
        failed: 2,
        pending: 1,
        avg_time: 4500
      };
      const mockServiceResults = [
        { service_used: 'midjourney', count: 5 },
        { service_used: 'dalle', count: 3 },
        { service_used: 'stable-diffusion', count: 2 }
      ];

      mockStmt.first.mockResolvedValue(mockCountResult);
      mockStmt.all.mockResolvedValue({ results: mockServiceResults });

      const result = await service.getGenerationStats();

      expect(result).toEqual({
        totalImages: 10,
        completedImages: 7,
        failedImages: 2,
        pendingImages: 1,
        averageGenerationTime: 4500,
        serviceBreakdown: {
          midjourney: 5,
          dalle: 3,
          'stable-diffusion': 2
        }
      });
    });

    it('should return stats for specific user', async () => {
      const mockCountResult = {
        total: 5,
        completed: 4,
        failed: 1,
        pending: 0,
        avg_time: 3000
      };
      const mockServiceResults = [
        { service_used: 'midjourney', count: 3 },
        { service_used: 'dalle', count: 2 }
      ];

      mockStmt.first.mockResolvedValue(mockCountResult);
      mockStmt.all.mockResolvedValue({ results: mockServiceResults });

      const result = await service.getGenerationStats('user-456');

      expect(result.totalImages).toBe(5);
      expect(result.serviceBreakdown).toEqual({
        midjourney: 3,
        dalle: 2
      });
    });

    it('should handle null results gracefully', async () => {
      mockStmt.first.mockResolvedValue(null);
      mockStmt.all.mockResolvedValue({ results: [] });

      const result = await service.getGenerationStats();

      expect(result).toEqual({
        totalImages: 0,
        completedImages: 0,
        failedImages: 0,
        pendingImages: 0,
        averageGenerationTime: 0,
        serviceBreakdown: {}
      });
    });

    it('should handle database errors during stats query', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getGenerationStats()).rejects.toThrow(DatabaseError);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should cleanup old records with default days', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 3 });

      const result = await service.cleanupOldRecords();

      expect(result).toBe(3);
      expect(mockStmt.bind).toHaveBeenCalledWith(expect.any(String));
    });

    it('should cleanup old records with custom days', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 5 });

      const result = await service.cleanupOldRecords(30);

      expect(result).toBe(5);
    });

    it('should return 0 when no records cleaned up', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: null });

      const result = await service.cleanupOldRecords();

      expect(result).toBe(0);
    });

    it('should handle database errors during cleanup', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupOldRecords()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity with default hours', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getRecentActivity('user-456');

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', expect.any(String));
    });

    it('should return recent activity with custom hours', async () => {
      const mockImages = [mockCompleteImageRecord];
      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await service.getRecentActivity('user-456', 48);

      expect(result).toEqual(mockImages);
    });

    it('should handle database errors during recent activity query', async () => {
      mockStmt.all.mockRejectedValue(new Error('Database error'));

      await expect(service.getRecentActivity('user-456')).rejects.toThrow(DatabaseError);
    });
  });

  describe('batchUpdateStatus', () => {
    it('should batch update multiple statuses', async () => {
      const mockResults = [
        { success: true, changes: 1 },
        { success: true, changes: 1 }
      ];
      mockDb.batch.mockResolvedValue(mockResults);

      const updates = [
        {
          imageId: 'image-1',
          status: 'COMPLETE' as const,
          generationTimeMs: 3000,
          publicUrl: 'https://r2.example.com/image-1.jpg'
        },
        {
          imageId: 'image-2',
          status: 'FAILED' as const,
          errorMessage: 'Generation failed'
        }
      ];

      const result = await service.batchUpdateStatus(updates);

      expect(result).toBe(2);
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should handle batch with no changes', async () => {
      const mockResults = [
        { success: true, changes: 0 },
        { success: true, changes: null }
      ];
      mockDb.batch.mockResolvedValue(mockResults);

      const updates = [
        { imageId: 'image-1', status: 'COMPLETE' as const },
        { imageId: 'image-2', status: 'FAILED' as const }
      ];

      const result = await service.batchUpdateStatus(updates);

      expect(result).toBe(0);
    });

    it('should handle database errors during batch update', async () => {
      mockDb.batch.mockRejectedValue(new Error('Batch error'));

      const updates = [
        { imageId: 'image-1', status: 'COMPLETE' as const }
      ];

      await expect(service.batchUpdateStatus(updates)).rejects.toThrow(DatabaseError);
    });
  });
});