import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptCacheService } from '../promptCacheService';
import { ImageGenerationParams, PromptCacheRecord } from '../types';
import { DatabaseError } from '../database';

// Mock crypto module
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mocked-hash-123')
  }))
}));

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

describe('PromptCacheService', () => {
  let mockDb: any;
  let mockStmt: any;
  let service: PromptCacheService;

  const mockParams: ImageGenerationParams = {
    pose: 'arms-crossed',
    outfit: 'hoodie-sweatpants',
    footwear: 'air-jordan-1-chicago',
    prop: 'cave-map'
  };

  const mockCacheRecord: PromptCacheRecord = {
    parameters_hash: 'mocked-hash-123',
    full_prompt: 'A detailed prompt for image generation...',
    created_at: '2024-01-01T12:00:00.000Z',
    last_used: '2024-01-01T12:00:00.000Z',
    usage_count: 1
  };

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement();
    mockDb.prepare.mockReturnValue(mockStmt);
    service = new PromptCacheService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedPrompt', () => {
    it('should return cached prompt when found', async () => {
      mockStmt.first
        .mockResolvedValueOnce(mockCacheRecord) // getCachedPrompt query
        .mockResolvedValueOnce({ success: true }); // updateCacheUsage query
      mockStmt.run.mockResolvedValue({ success: true });

      const result = await service.getCachedPrompt(mockParams);

      expect(result).toBe(mockCacheRecord.full_prompt);
      expect(mockStmt.bind).toHaveBeenCalledWith('mocked-hash-123');
    });

    it('should return null when prompt not cached', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.getCachedPrompt(mockParams);

      expect(result).toBeNull();
    });

    it('should update usage when cache hit occurs', async () => {
      mockStmt.first
        .mockResolvedValueOnce(mockCacheRecord)
        .mockResolvedValueOnce({ success: true });
      mockStmt.run.mockResolvedValue({ success: true });

      await service.getCachedPrompt(mockParams);

      // Should call update usage
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE PromptCache')
      );
    });

    it('should handle database errors during cache lookup', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getCachedPrompt(mockParams)).rejects.toThrow(DatabaseError);
    });
  });

  describe('cachePrompt', () => {
    it('should cache new prompt successfully', async () => {
      mockStmt.first.mockResolvedValue(null); // No existing entry
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.cachePrompt(mockParams, 'Test prompt');

      expect(result).toBe('mocked-hash-123');
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'mocked-hash-123',
        'Test prompt',
        expect.any(String), // created_at
        expect.any(String), // last_used
        1 // usage_count
      );
    });

    it('should update existing prompt and increment usage count', async () => {
      mockStmt.first.mockResolvedValue({ usage_count: 5 }); // Existing entry
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.cachePrompt(mockParams, 'Updated prompt');

      expect(result).toBe('mocked-hash-123');
      expect(mockStmt.bind).toHaveBeenCalledWith(
        'mocked-hash-123',
        'Updated prompt',
        expect.any(String), // created_at
        expect.any(String), // last_used
        6 // incremented usage_count
      );
    });

    it('should handle cache insertion failures', async () => {
      mockStmt.first.mockResolvedValue(null);
      mockStmt.run.mockResolvedValue({ success: false });

      await expect(service.cachePrompt(mockParams, 'Test prompt')).rejects.toThrow(DatabaseError);
    });

    it('should handle database errors during caching', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.cachePrompt(mockParams, 'Test prompt')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockBasicStats = {
        total_entries: 100,
        total_hits: 500,
        avg_usage: 5.0,
        oldest: '2024-01-01T00:00:00.000Z',
        newest: '2024-01-02T00:00:00.000Z'
      };
      const mockMostUsed = {
        parameters_hash: 'most-used-hash',
        usage_count: 25
      };

      mockStmt.first
        .mockResolvedValueOnce(mockBasicStats)
        .mockResolvedValueOnce(mockMostUsed);

      const result = await service.getCacheStats();

      expect(result).toEqual({
        totalEntries: 100,
        totalHits: 500,
        averageUsageCount: 5.0,
        oldestEntry: '2024-01-01T00:00:00.000Z',
        newestEntry: '2024-01-02T00:00:00.000Z',
        mostUsedEntry: {
          hash: 'most-used-hash',
          count: 25
        }
      });
    });

    it('should handle null results gracefully', async () => {
      mockStmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getCacheStats();

      expect(result).toEqual({
        totalEntries: 0,
        totalHits: 0,
        averageUsageCount: 0,
        oldestEntry: null,
        newestEntry: null,
        mostUsedEntry: null
      });
    });

    it('should handle database errors during stats query', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getCacheStats()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCachedEntries', () => {
    it('should return cached entries with default parameters', async () => {
      const mockEntries = [mockCacheRecord];
      mockStmt.all.mockResolvedValue({ results: mockEntries });

      const result = await service.getCachedEntries();

      expect(result).toEqual(mockEntries);
      expect(mockStmt.bind).toHaveBeenCalledWith(50, 0);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY last_used DESC')
      );
    });

    it('should return cached entries with custom parameters', async () => {
      const mockEntries = [mockCacheRecord];
      mockStmt.all.mockResolvedValue({ results: mockEntries });

      const result = await service.getCachedEntries(10, 20, 'usage_count', 'ASC');

      expect(result).toEqual(mockEntries);
      expect(mockStmt.bind).toHaveBeenCalledWith(10, 20);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count ASC')
      );
    });

    it('should handle database errors during entries query', async () => {
      mockStmt.all.mockRejectedValue(new Error('Database error'));

      await expect(service.getCachedEntries()).rejects.toThrow(DatabaseError);
    });
  });

  describe('cleanupOldEntries', () => {
    it('should cleanup old entries with default days', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 10 });

      const result = await service.cleanupOldEntries();

      expect(result).toBe(10);
      expect(mockStmt.bind).toHaveBeenCalledWith(expect.any(String));
    });

    it('should cleanup old entries with custom days', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 5 });

      const result = await service.cleanupOldEntries(60);

      expect(result).toBe(5);
    });

    it('should return 0 when no entries cleaned up', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: null });

      const result = await service.cleanupOldEntries();

      expect(result).toBe(0);
    });

    it('should handle database errors during cleanup', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupOldEntries()).rejects.toThrow(DatabaseError);
    });
  });

  describe('cleanupLeastUsed', () => {
    it('should cleanup least used entries', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 50 });

      const result = await service.cleanupLeastUsed(500);

      expect(result).toBe(50);
      expect(mockStmt.bind).toHaveBeenCalledWith(500);
    });

    it('should use default keep count', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 100 });

      const result = await service.cleanupLeastUsed();

      expect(result).toBe(100);
      expect(mockStmt.bind).toHaveBeenCalledWith(1000);
    });

    it('should handle database errors during least used cleanup', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupLeastUsed()).rejects.toThrow(DatabaseError);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache entry successfully', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const result = await service.invalidateCache(mockParams);

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('mocked-hash-123');
    });

    it('should return false when no entry to invalidate', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 0 });

      const result = await service.invalidateCache(mockParams);

      expect(result).toBe(false);
    });

    it('should handle database errors during invalidation', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.invalidateCache(mockParams)).rejects.toThrow(DatabaseError);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: 100 });

      const result = await service.clearCache();

      expect(result).toBe(100);
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM PromptCache');
    });

    it('should return 0 when no entries to clear', async () => {
      mockStmt.run.mockResolvedValue({ success: true, changes: null });

      const result = await service.clearCache();

      expect(result).toBe(0);
    });

    it('should handle database errors during clear', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(service.clearCache()).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCacheHitRate', () => {
    it('should return cache hit rate statistics', async () => {
      const mockResult = {
        entries_used: 50,
        total_usage: 200
      };
      mockStmt.first.mockResolvedValue(mockResult);

      const result = await service.getCacheHitRate(24);

      expect(result).toEqual({
        totalRequests: 250, // 200 + 50
        cacheHits: 200,
        hitRate: 80, // (200/250) * 100
        period: '24 hours'
      });
    });

    it('should handle zero usage gracefully', async () => {
      mockStmt.first.mockResolvedValue({ entries_used: 0, total_usage: 0 });

      const result = await service.getCacheHitRate();

      expect(result.hitRate).toBe(0);
      expect(result.totalRequests).toBe(0);
    });

    it('should handle null results gracefully', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.getCacheHitRate();

      expect(result).toEqual({
        totalRequests: 0,
        cacheHits: 0,
        hitRate: 0,
        period: '24 hours'
      });
    });

    it('should handle database errors during hit rate query', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getCacheHitRate()).rejects.toThrow(DatabaseError);
    });
  });

  describe('warmupCache', () => {
    it('should warmup cache with common combinations', async () => {
      mockStmt.first.mockResolvedValue(null); // No existing entries
      mockStmt.run.mockResolvedValue({ success: true, changes: 1 });

      const combinations = [
        { params: mockParams, prompt: 'Prompt 1' },
        { params: { ...mockParams, pose: 'pointing-forward' }, prompt: 'Prompt 2' }
      ];

      const result = await service.warmupCache(combinations);

      expect(result).toBe(2);
    });

    it('should continue with other combinations if one fails', async () => {
      mockStmt.first.mockResolvedValue(null);
      mockStmt.run
        .mockResolvedValueOnce({ success: false }) // First fails
        .mockResolvedValueOnce({ success: true, changes: 1 }); // Second succeeds

      const combinations = [
        { params: mockParams, prompt: 'Prompt 1' },
        { params: { ...mockParams, pose: 'pointing-forward' }, prompt: 'Prompt 2' }
      ];

      const result = await service.warmupCache(combinations);

      expect(result).toBe(1); // Only one succeeded
    });

    it('should handle database errors during warmup', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      const combinations = [
        { params: mockParams, prompt: 'Prompt 1' }
      ];

      await expect(service.warmupCache(combinations)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCacheEntryByHash', () => {
    it('should return cache entry by hash', async () => {
      mockStmt.first.mockResolvedValue(mockCacheRecord);

      const result = await service.getCacheEntryByHash('test-hash');

      expect(result).toEqual(mockCacheRecord);
      expect(mockStmt.bind).toHaveBeenCalledWith('test-hash');
    });

    it('should return null when entry not found', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.getCacheEntryByHash('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should handle database errors during hash lookup', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.getCacheEntryByHash('test-hash')).rejects.toThrow(DatabaseError);
    });
  });

  describe('wouldCacheHit', () => {
    it('should return true when cache would hit', async () => {
      mockStmt.first.mockResolvedValue({ exists: 1 });

      const result = await service.wouldCacheHit(mockParams);

      expect(result).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('mocked-hash-123');
    });

    it('should return false when cache would miss', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await service.wouldCacheHit(mockParams);

      expect(result).toBe(false);
    });

    it('should handle database errors during cache hit check', async () => {
      mockStmt.first.mockRejectedValue(new Error('Database error'));

      await expect(service.wouldCacheHit(mockParams)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getParametersHash', () => {
    it('should return consistent hash for same parameters', () => {
      const hash1 = service.getParametersHash(mockParams);
      const hash2 = service.getParametersHash(mockParams);

      expect(hash1).toBe(hash2);
      expect(hash1).toBe('mocked-hash-123');
    });

    it('should return same hash regardless of parameter order', () => {
      const params1 = { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' };
      const params2 = { footwear: 'air-jordan-1-chicago', pose: 'arms-crossed', outfit: 'hoodie-sweatpants' };

      const hash1 = service.getParametersHash(params1);
      const hash2 = service.getParametersHash(params2);

      expect(hash1).toBe(hash2);
    });
  });
});