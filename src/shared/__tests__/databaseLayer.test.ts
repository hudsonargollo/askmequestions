import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseLayer, DatabaseError } from '../database';
import { GeneratedImageRecord, PromptCacheRecord } from '../types';

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

describe('DatabaseLayer', () => {
  let mockDb: any;
  let mockStmt: any;
  let databaseLayer: DatabaseLayer;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement();
    mockDb.prepare.mockReturnValue(mockStmt);
    databaseLayer = new DatabaseLayer(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('insertGeneratedImage', () => {
    it('should insert a new generated image record', async () => {
      const record: GeneratedImageRecord = {
        image_id: 'test-image-123',
        user_id: 'user-456',
        r2_object_key: 'images/123/test.png',
        prompt_parameters: JSON.stringify({
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        }),
        created_at: '2025-01-31T10:00:00Z',
        status: 'PENDING',
        error_message: null,
        generation_time_ms: null,
        service_used: null,
        public_url: null,
      };

      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await databaseLayer.insertGeneratedImage(record);

      expect(result).toBe('test-image-123');
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO GeneratedImages'));
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'test-image-123',
        'user-456',
        'images/123/test.png',
        record.prompt_parameters,
        'PENDING',
        null,
        null,
        null,
        null
      );
    });

    it('should handle insertion errors', async () => {
      const record: GeneratedImageRecord = {
        image_id: 'test-image-123',
        user_id: 'user-456',
        r2_object_key: 'images/123/test.png',
        prompt_parameters: '{}',
        created_at: '2025-01-31T10:00:00Z',
        status: 'PENDING',
        error_message: null,
        generation_time_ms: null,
        service_used: null,
        public_url: null,
      };

      mockStmt.run.mockRejectedValue(new Error('Database constraint violation'));

      await expect(databaseLayer.insertGeneratedImage(record)).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateImageStatus', () => {
    it('should update image status successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await databaseLayer.updateImageStatus('test-image-123', 'COMPLETE');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE GeneratedImages'));
      expect(mockStmt.bind).toHaveBeenCalledWith('COMPLETE', null, 'test-image-123');
    });

    it('should update image status with error message', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await databaseLayer.updateImageStatus('test-image-123', 'FAILED', 'Generation timeout');

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('FAILED', 'Generation timeout', 'test-image-123');
    });

    it('should return false when no rows are updated', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 0 });

      const result = await databaseLayer.updateImageStatus('non-existent-image', 'COMPLETE');

      expect(result).toBe(false);
    });

    it('should handle update errors', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(databaseLayer.updateImageStatus('test-image-123', 'COMPLETE')).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateGeneratedImage', () => {
    it('should update multiple fields', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const updates = {
        status: 'COMPLETE' as const,
        r2_object_key: 'images/123/final.png',
        public_url: 'https://example.com/images/123/final.png',
        generation_time_ms: 5000,
        service_used: 'dalle',
      };

      const result = await databaseLayer.updateGeneratedImage('test-image-123', updates);

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'COMPLETE',
        'images/123/final.png',
        'https://example.com/images/123/final.png',
        5000,
        'dalle',
        'test-image-123'
      );
    });

    it('should handle partial updates', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const updates = {
        status: 'COMPLETE' as const,
        generation_time_ms: 3000,
      };

      const result = await databaseLayer.updateGeneratedImage('test-image-123', updates);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE GeneratedImages SET status = ?, generation_time_ms = ? WHERE image_id = ?'
      );
    });

    it('should return false for empty updates', async () => {
      const result = await databaseLayer.updateGeneratedImage('test-image-123', {});

      expect(result).toBe(false);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe('getGeneratedImage', () => {
    it('should retrieve image by ID', async () => {
      const mockImage: GeneratedImageRecord = {
        image_id: 'test-image-123',
        user_id: 'user-456',
        r2_object_key: 'images/123/test.png',
        prompt_parameters: '{"pose":"arms-crossed"}',
        created_at: '2025-01-31T10:00:00Z',
        status: 'COMPLETE',
        error_message: null,
        generation_time_ms: 5000,
        service_used: 'dalle',
        public_url: 'https://example.com/images/123/test.png',
      };

      mockStmt.first.mockResolvedValue(mockImage);

      const result = await databaseLayer.getGeneratedImage('test-image-123');

      expect(result).toEqual(mockImage);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(mockStmt.bind).toHaveBeenCalledWith('test-image-123');
    });

    it('should return null for non-existent image', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await databaseLayer.getGeneratedImage('non-existent-image');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(databaseLayer.getGeneratedImage('test-image-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getUserImages', () => {
    it('should retrieve user images with default pagination', async () => {
      const mockImages: GeneratedImageRecord[] = [
        {
          image_id: 'image-1',
          user_id: 'user-456',
          r2_object_key: 'images/1/test.png',
          prompt_parameters: '{"pose":"arms-crossed"}',
          created_at: '2025-01-31T10:00:00Z',
          status: 'COMPLETE',
          error_message: null,
          generation_time_ms: 5000,
          service_used: 'dalle',
          public_url: 'https://example.com/images/1/test.png',
        },
        {
          image_id: 'image-2',
          user_id: 'user-456',
          r2_object_key: 'images/2/test.png',
          prompt_parameters: '{"pose":"pointing-forward"}',
          created_at: '2025-01-31T09:00:00Z',
          status: 'COMPLETE',
          error_message: null,
          generation_time_ms: 4000,
          service_used: 'midjourney',
          public_url: 'https://example.com/images/2/test.png',
        },
      ];

      mockStmt.all.mockResolvedValue({ results: mockImages });

      const result = await databaseLayer.getUserImages('user-456');

      expect(result).toEqual(mockImages);
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 20, 0);
    });

    it('should handle custom pagination', async () => {
      mockStmt.all.mockResolvedValue({ results: [] });

      await databaseLayer.getUserImages('user-456', { limit: 10, offset: 20 });

      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 10, 20);
    });

    it('should filter by status', async () => {
      mockStmt.all.mockResolvedValue({ results: [] });

      await databaseLayer.getUserImages('user-456', { status: 'COMPLETE' });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('AND status = ?'));
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'COMPLETE', 20, 0);
    });

    it('should handle custom sorting', async () => {
      mockStmt.all.mockResolvedValue({ results: [] });

      await databaseLayer.getUserImages('user-456', { 
        sortBy: 'generation_time_ms', 
        sortOrder: 'asc' 
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY generation_time_ms ASC'));
    });

    it('should support legacy function signature', async () => {
      mockStmt.all.mockResolvedValue({ results: [] });

      await databaseLayer.getUserImages('user-456', 15, 30);

      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 15, 30);
    });
  });

  describe('getUserImageCount', () => {
    it('should return total count for user', async () => {
      mockStmt.first.mockResolvedValue({ count: 25 });

      const result = await databaseLayer.getUserImageCount('user-456');

      expect(result).toBe(25);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM GeneratedImages WHERE user_id = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456');
    });

    it('should filter count by status', async () => {
      mockStmt.first.mockResolvedValue({ count: 15 });

      const result = await databaseLayer.getUserImageCount('user-456', 'COMPLETE');

      expect(result).toBe(15);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('AND status = ?'));
      expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'COMPLETE');
    });

    it('should return 0 when count is null', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await databaseLayer.getUserImageCount('user-456');

      expect(result).toBe(0);
    });
  });

  describe('deleteGeneratedImage', () => {
    it('should delete image successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await databaseLayer.deleteGeneratedImage('test-image-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM GeneratedImages WHERE image_id = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith('test-image-123');
    });

    it('should return false when no image is deleted', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 0 });

      const result = await databaseLayer.deleteGeneratedImage('non-existent-image');

      expect(result).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(databaseLayer.deleteGeneratedImage('test-image-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('prompt cache operations', () => {
    describe('getPromptCache', () => {
      it('should retrieve cached prompt', async () => {
        const mockCache: PromptCacheRecord = {
          parameters_hash: 'hash123',
          full_prompt: 'Generated prompt text',
          created_at: '2025-01-31T10:00:00Z',
          last_used: '2025-01-31T10:00:00Z',
          usage_count: 1,
        };

        mockStmt.first.mockResolvedValue(mockCache);

        const result = await databaseLayer.getPromptCache('hash123');

        expect(result).toEqual(mockCache);
        expect(mockStmt.bind).toHaveBeenCalledWith('hash123');
      });

      it('should return null for non-existent cache', async () => {
        mockStmt.first.mockResolvedValue(null);

        const result = await databaseLayer.getPromptCache('non-existent-hash');

        expect(result).toBeNull();
      });
    });

    describe('upsertPromptCache', () => {
      it('should insert new cache entry', async () => {
        mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

        await databaseLayer.upsertPromptCache('hash123', 'Generated prompt text');

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO PromptCache'));
        expect(mockStmt.bind).toHaveBeenCalledWith('hash123', 'Generated prompt text');
      });

      it('should handle upsert errors', async () => {
        mockStmt.run.mockRejectedValue(new Error('Database error'));

        await expect(databaseLayer.upsertPromptCache('hash123', 'prompt')).rejects.toThrow(DatabaseError);
      });
    });

    describe('cleanupPromptCache', () => {
      it('should cleanup old cache entries', async () => {
        mockStmt.run.mockResolvedValue({ success: true, changes: 5 });

        const result = await databaseLayer.cleanupPromptCache(30);

        expect(result).toBe(5);
        expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM PromptCache WHERE last_used < ?');
        expect(mockStmt.bind).toHaveBeenCalledWith(expect.any(String));
      });

      it('should use default cleanup period', async () => {
        mockStmt.run.mockResolvedValue({ success: true, changes: 3 });

        const result = await databaseLayer.cleanupPromptCache();

        expect(result).toBe(3);
      });
    });
  });

  describe('statistics and analytics', () => {
    describe('getStats', () => {
      it('should return comprehensive database statistics', async () => {
        mockStmt.first
          .mockResolvedValueOnce({
            total: 100,
            pending: 5,
            complete: 90,
            failed: 5,
          })
          .mockResolvedValueOnce({ count: 50 })
          .mockResolvedValueOnce({ avg: 4500 });

        const result = await databaseLayer.getStats();

        expect(result).toEqual({
          totalImages: 100,
          pendingImages: 5,
          completeImages: 90,
          failedImages: 5,
          cacheEntries: 50,
          avgGenerationTime: 4500,
        });
      });

      it('should handle null values gracefully', async () => {
        mockStmt.first
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        const result = await databaseLayer.getStats();

        expect(result).toEqual({
          totalImages: 0,
          pendingImages: 0,
          completeImages: 0,
          failedImages: 0,
          cacheEntries: 0,
          avgGenerationTime: 0,
        });
      });
    });

    describe('getUserAverageGenerationTime', () => {
      it('should return user average generation time', async () => {
        mockStmt.first.mockResolvedValue({ avg: 3500 });

        const result = await databaseLayer.getUserAverageGenerationTime('user-456');

        expect(result).toBe(3500);
        expect(mockStmt.bind).toHaveBeenCalledWith('user-456');
      });

      it('should return 0 for users with no completed generations', async () => {
        mockStmt.first.mockResolvedValue(null);

        const result = await databaseLayer.getUserAverageGenerationTime('user-456');

        expect(result).toBe(0);
      });
    });

    describe('getUserParameterStats', () => {
      it('should analyze user parameter usage', async () => {
        const mockImages = [
          { prompt_parameters: '{"pose":"arms-crossed","outfit":"hoodie-sweatpants","footwear":"jordan-1"}' },
          { prompt_parameters: '{"pose":"arms-crossed","outfit":"tshirt-shorts","footwear":"jordan-1"}' },
          { prompt_parameters: '{"pose":"pointing-forward","outfit":"hoodie-sweatpants","footwear":"air-max-90","prop":"cave-map"}' },
        ];

        mockStmt.all.mockResolvedValue({ results: mockImages });

        const result = await databaseLayer.getUserParameterStats('user-456');

        expect(result.most_used_pose).toBe('arms-crossed');
        expect(result.most_used_outfit).toBe('hoodie-sweatpants');
        expect(result.most_used_footwear).toBe('jordan-1');
        expect(result.most_used_prop).toBe('cave-map');
        expect(result.pose_distribution['arms-crossed']).toBe(2);
        expect(result.pose_distribution['pointing-forward']).toBe(1);
      });

      it('should handle invalid JSON gracefully', async () => {
        const mockImages = [
          { prompt_parameters: '{"pose":"arms-crossed"}' },
          { prompt_parameters: 'invalid-json' },
          { prompt_parameters: '{"pose":"pointing-forward"}' },
        ];

        mockStmt.all.mockResolvedValue({ results: mockImages });

        const result = await databaseLayer.getUserParameterStats('user-456');

        expect(result.pose_distribution['arms-crossed']).toBe(1);
        expect(result.pose_distribution['pointing-forward']).toBe(1);
      });
    });
  });

  describe('search and filtering', () => {
    describe('searchUserImagesByParameters', () => {
      it('should search by pose parameter', async () => {
        mockStmt.all.mockResolvedValue({ results: [] });

        await databaseLayer.searchUserImagesByParameters('user-456', {
          pose: 'arms-crossed',
          limit: 10,
          offset: 0,
        });

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("JSON_EXTRACT(prompt_parameters, '$.pose') = ?"));
        expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'arms-crossed', 10, 0);
      });

      it('should search by multiple parameters', async () => {
        mockStmt.all.mockResolvedValue({ results: [] });

        await databaseLayer.searchUserImagesByParameters('user-456', {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          status: 'COMPLETE',
        });

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("JSON_EXTRACT(prompt_parameters, '$.pose') = ?"));
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("JSON_EXTRACT(prompt_parameters, '$.outfit') = ?"));
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("AND status = ?"));
      });

      it('should handle frame-specific searches', async () => {
        mockStmt.all.mockResolvedValue({ results: [] });

        await databaseLayer.searchUserImagesByParameters('user-456', {
          frameType: 'onboarding',
          frameId: '01A',
        });

        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("JSON_EXTRACT(prompt_parameters, '$.frameType') = ?"));
        expect(mockStmt.bind).toHaveBeenCalledWith('user-456', 'onboarding', 20, 0);
      });
    });

    describe('countUserImagesByParameters', () => {
      it('should count images matching parameters', async () => {
        mockStmt.first.mockResolvedValue({ count: 15 });

        const result = await databaseLayer.countUserImagesByParameters('user-456', {
          pose: 'arms-crossed',
          status: 'COMPLETE',
        });

        expect(result).toBe(15);
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'));
      });

      it('should return 0 for no matches', async () => {
        mockStmt.first.mockResolvedValue(null);

        const result = await databaseLayer.countUserImagesByParameters('user-456', {
          pose: 'non-existent-pose',
        });

        expect(result).toBe(0);
      });
    });
  });

  describe('administrative functions', () => {
    describe('getTopImageGenerators', () => {
      it('should return top generators with statistics', async () => {
        const mockGenerators = [
          {
            user_id: 'user-1',
            total_images: 50,
            successful_images: 45,
            avg_generation_time: 4000,
            last_generation: '2025-01-31T10:00:00Z',
          },
          {
            user_id: 'user-2',
            total_images: 30,
            successful_images: 28,
            avg_generation_time: 3500,
            last_generation: '2025-01-31T09:00:00Z',
          },
        ];

        mockStmt.all.mockResolvedValue({ results: mockGenerators });

        const result = await databaseLayer.getTopImageGenerators(10);

        expect(result).toEqual(mockGenerators);
        expect(mockStmt.bind).toHaveBeenCalledWith(10);
      });
    });

    describe('getRecentActivity', () => {
      it('should return recent generation activity', async () => {
        const mockActivity = [
          {
            image_id: 'image-1',
            user_id: 'user-1',
            status: 'COMPLETE',
            created_at: '2025-01-31T10:00:00Z',
            generation_time_ms: 4000,
            service_used: 'dalle',
          },
        ];

        mockStmt.all.mockResolvedValue({ results: mockActivity });

        const result = await databaseLayer.getRecentActivity(50);

        expect(result).toEqual(mockActivity);
        expect(mockStmt.bind).toHaveBeenCalledWith(50);
      });
    });

    describe('getServiceUsageStats', () => {
      it('should return service usage statistics', async () => {
        const mockServiceStats = [
          {
            service_used: 'dalle',
            usage_count: 100,
            avg_time: 4000,
            successful_count: 95,
            failed_count: 5,
          },
          {
            service_used: 'midjourney',
            usage_count: 50,
            avg_time: 6000,
            successful_count: 48,
            failed_count: 2,
          },
        ];

        mockStmt.all.mockResolvedValue({ results: mockServiceStats });

        const result = await databaseLayer.getServiceUsageStats();

        expect(result.dalle).toEqual({
          usage_count: 100,
          avg_generation_time: 4000,
          successful_count: 95,
          failed_count: 5,
          success_rate: 95,
        });
        expect(result.midjourney).toEqual({
          usage_count: 50,
          avg_generation_time: 6000,
          successful_count: 48,
          failed_count: 2,
          success_rate: 96,
        });
      });
    });

    describe('cleanupFailedImages', () => {
      it('should cleanup old failed images', async () => {
        mockStmt.run.mockResolvedValue({ success: true, changes: 10 });

        const result = await databaseLayer.cleanupFailedImages(7);

        expect(result).toBe(10);
        expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE status = 'FAILED' AND created_at < ?"));
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle database connection errors', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      await expect(databaseLayer.getGeneratedImage('test-image')).rejects.toThrow(DatabaseError);
    });

    it('should handle malformed SQL queries', async () => {
      mockStmt.run.mockRejectedValue(new Error('SQL syntax error'));

      await expect(databaseLayer.insertGeneratedImage({
        image_id: 'test',
        user_id: 'user',
        r2_object_key: 'key',
        prompt_parameters: '{}',
        created_at: '2025-01-31T10:00:00Z',
        status: 'PENDING',
        error_message: null,
        generation_time_ms: null,
        service_used: null,
        public_url: null,
      })).rejects.toThrow(DatabaseError);
    });

    it('should handle concurrent access scenarios', async () => {
      // Simulate concurrent updates
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        databaseLayer.updateImageStatus(`image-${i}`, 'COMPLETE')
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r === true)).toBe(true);
      expect(mockStmt.run).toHaveBeenCalledTimes(10);
    });
  });
});