import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptCacheService } from '../promptCacheService';
import { ImageGenerationParams } from '../types';

// Mock D1Database interface for performance testing
const createMockD1Database = () => ({
  prepare: vi.fn(),
  batch: vi.fn(),
  dump: vi.fn(),
  exec: vi.fn()
});

// Mock D1PreparedStatement with realistic delays
const createMockPreparedStatement = (delay: number = 0) => ({
  bind: vi.fn().mockReturnThis(),
  run: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({ success: true, changes: 1 }), delay))
  ),
  first: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(null), delay))
  ),
  all: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({ results: [] }), delay))
  )
});

describe('PromptCacheService Performance Tests', () => {
  let mockDb: any;
  let mockStmt: any;
  let service: PromptCacheService;

  const generateTestParams = (index: number): ImageGenerationParams => ({
    pose: `pose-${index % 10}`,
    outfit: `outfit-${index % 5}`,
    footwear: `footwear-${index % 8}`,
    prop: index % 3 === 0 ? `prop-${index % 4}` : undefined
  });

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement(1); // 1ms delay to simulate DB latency
    mockDb.prepare.mockReturnValue(mockStmt);
    service = new PromptCacheService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Performance', () => {
    it('should handle concurrent cache operations efficiently', async () => {
      const startTime = Date.now();
      const concurrentOperations = 50;
      
      // Simulate concurrent cache operations
      const promises = Array.from({ length: concurrentOperations }, async (_, i) => {
        const params = generateTestParams(i);
        const prompt = `Generated prompt for test ${i}`;
        
        // Alternate between cache and retrieve operations
        if (i % 2 === 0) {
          return service.cachePrompt(params, prompt);
        } else {
          return service.getCachedPrompt(params);
        }
      });

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (allowing for 1ms delay per operation + overhead)
      expect(duration).toBeLessThan(concurrentOperations * 10); // 10ms per operation max
      expect(promises).toHaveLength(concurrentOperations);
    });

    it('should efficiently handle batch cache warmup', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      
      const combinations = Array.from({ length: batchSize }, (_, i) => ({
        params: generateTestParams(i),
        prompt: `Batch prompt ${i}`
      }));

      const result = await service.warmupCache(combinations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBe(batchSize);
      // Should complete batch operations efficiently
      expect(duration).toBeLessThan(batchSize * 5); // 5ms per operation max
    });

    it('should handle large cache cleanup operations efficiently', async () => {
      // Mock a large number of entries to cleanup
      mockStmt.run.mockResolvedValue({ success: true, changes: 10000 });
      
      const startTime = Date.now();
      const deletedCount = await service.cleanupOldEntries(30);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(deletedCount).toBe(10000);
      // Cleanup should be fast even for large datasets
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should efficiently generate consistent parameter hashes', async () => {
      const iterations = 1000;
      const params = generateTestParams(1);
      
      const startTime = Date.now();
      const hashes = Array.from({ length: iterations }, () => 
        service.getParametersHash(params)
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All hashes should be identical
      expect(new Set(hashes).size).toBe(1);
      
      // Hash generation should be very fast
      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(duration / iterations).toBeLessThan(0.1); // Less than 0.1ms per hash
    });

    it('should handle cache statistics queries efficiently', async () => {
      // Mock realistic statistics data
      const mockBasicStats = {
        total_entries: 50000,
        total_hits: 250000,
        avg_usage: 5.0,
        oldest: '2024-01-01T00:00:00.000Z',
        newest: '2024-01-02T00:00:00.000Z'
      };
      const mockMostUsed = {
        parameters_hash: 'most-used-hash',
        usage_count: 1000
      };

      mockStmt.first
        .mockResolvedValueOnce(mockBasicStats)
        .mockResolvedValueOnce(mockMostUsed);

      const startTime = Date.now();
      const stats = await service.getCacheStats();
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(stats.totalEntries).toBe(50000);
      expect(stats.totalHits).toBe(250000);
      
      // Statistics query should be fast even for large datasets
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });

    it('should efficiently handle cache hit rate calculations', async () => {
      const mockResult = {
        entries_used: 5000,
        total_usage: 25000
      };
      mockStmt.first.mockResolvedValue(mockResult);

      const startTime = Date.now();
      const hitRate = await service.getCacheHitRate(24);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(hitRate.totalRequests).toBe(30000); // 25000 + 5000
      expect(hitRate.cacheHits).toBe(25000);
      expect(hitRate.hitRate).toBe(83.33); // (25000/30000) * 100
      
      // Hit rate calculation should be very fast
      expect(duration).toBeLessThan(20); // Should complete within 20ms
    });

    it('should handle memory-efficient parameter normalization', async () => {
      const iterations = 1000;
      
      // Generate many different parameter combinations
      const startTime = Date.now();
      const hashes = Array.from({ length: iterations }, (_, i) => {
        const params = generateTestParams(i);
        return service.getParametersHash(params);
      });
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(hashes).toHaveLength(iterations);
      
      // Hash generation should be fast
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      
      // Should generate reasonable number of unique hashes
      const uniqueHashes = new Set(hashes).size;
      expect(uniqueHashes).toBeGreaterThan(10); // Should have variety
      expect(uniqueHashes).toBeLessThan(iterations); // But not all unique due to modulo
      
      // Test that hash generation is consistent
      const params = generateTestParams(1);
      const hash1 = service.getParametersHash(params);
      const hash2 = service.getParametersHash(params);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Cache Efficiency', () => {
    it('should demonstrate cache hit performance benefits', async () => {
      const params = generateTestParams(1);
      const prompt = 'Test prompt for performance';
      
      // First cache the prompt
      await service.cachePrompt(params, prompt);
      
      // Mock cache hit scenario
      mockStmt.first.mockResolvedValueOnce({
        parameters_hash: 'test-hash',
        full_prompt: prompt,
        created_at: '2024-01-01T12:00:00.000Z',
        last_used: '2024-01-01T12:00:00.000Z',
        usage_count: 1
      });
      
      const startTime = Date.now();
      const cachedPrompt = await service.getCachedPrompt(params);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(cachedPrompt).toBe(prompt);
      
      // Cache hit should be very fast
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });

    it('should efficiently handle cache miss scenarios', async () => {
      const params = generateTestParams(999); // Unique params
      
      // Mock cache miss
      mockStmt.first.mockResolvedValue(null);
      
      const startTime = Date.now();
      const result = await service.getCachedPrompt(params);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBeNull();
      
      // Cache miss should also be fast
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });

    it('should demonstrate efficient cache invalidation', async () => {
      const params = generateTestParams(1);
      
      const startTime = Date.now();
      const invalidated = await service.invalidateCache(params);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(invalidated).toBe(true);
      
      // Cache invalidation should be fast
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large cache entry retrievals efficiently', async () => {
      const entryCount = 1000;
      const mockEntries = Array.from({ length: entryCount }, (_, i) => ({
        parameters_hash: `hash-${i}`,
        full_prompt: `Prompt ${i}`,
        created_at: '2024-01-01T12:00:00.000Z',
        last_used: '2024-01-01T12:00:00.000Z',
        usage_count: i + 1
      }));
      
      mockStmt.all.mockResolvedValue({ results: mockEntries });
      
      const startTime = Date.now();
      const entries = await service.getCachedEntries(entryCount);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(entries).toHaveLength(entryCount);
      
      // Should handle large result sets efficiently
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should efficiently handle cache size management', async () => {
      const keepCount = 5000;
      const deletedCount = 2000;
      
      mockStmt.run.mockResolvedValue({ success: true, changes: deletedCount });
      
      const startTime = Date.now();
      const result = await service.cleanupLeastUsed(keepCount);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBe(deletedCount);
      
      // Cache size management should be efficient
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });
  });
});