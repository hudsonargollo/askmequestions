import { 
  PromptCacheRecord, 
  PromptCacheRecordSchema,
  ImageGenerationParams 
} from './types';
import { DatabaseConnection, DatabaseError } from './database';
import { createHash } from 'crypto';

/**
 * Service for managing PromptCache table operations
 * Provides cache hit/miss logic, parameter hashing, and cleanup mechanisms
 */
export class PromptCacheService {
  private connection: DatabaseConnection;

  constructor(database: D1Database) {
    this.connection = new DatabaseConnection(database);
  }

  /**
   * Generate a hash for the given parameters to use as cache key
   */
  private generateParametersHash(params: ImageGenerationParams): string {
    // Create a consistent string representation of parameters
    const normalizedParams = {
      pose: params.pose,
      outfit: params.outfit,
      footwear: params.footwear,
      prop: params.prop || null,
      frameType: params.frameType || null,
      frameId: params.frameId || null
    };

    // Sort keys to ensure consistent hashing
    const sortedParams = Object.keys(normalizedParams)
      .sort()
      .reduce((result: any, key) => {
        result[key] = normalizedParams[key as keyof typeof normalizedParams];
        return result;
      }, {});

    const paramString = JSON.stringify(sortedParams);
    return createHash('sha256').update(paramString).digest('hex');
  }

  /**
   * Get cached prompt by parameters
   */
  async getCachedPrompt(params: ImageGenerationParams): Promise<string | null> {
    try {
      const hash = this.generateParametersHash(params);
      
      const sql = `
        SELECT parameters_hash, full_prompt, created_at, last_used, usage_count
        FROM PromptCache 
        WHERE parameters_hash = ?
      `;

      const result = await this.connection.first<PromptCacheRecord>(sql, [hash]);
      
      if (!result) {
        return null;
      }

      // Update last_used and usage_count
      await this.updateCacheUsage(hash);

      // Validate the result structure
      const validatedResult = PromptCacheRecordSchema.parse(result);
      return validatedResult.full_prompt;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cached prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { params }
      );
    }
  }

  /**
   * Cache a prompt with its parameters
   */
  async cachePrompt(params: ImageGenerationParams, fullPrompt: string): Promise<string> {
    try {
      const hash = this.generateParametersHash(params);
      const now = new Date().toISOString();

      const sql = `
        INSERT OR REPLACE INTO PromptCache (
          parameters_hash, full_prompt, created_at, last_used, usage_count
        ) VALUES (?, ?, ?, ?, ?)
      `;

      // Check if entry already exists to preserve usage count
      const existing = await this.connection.first<{ usage_count: number }>(
        'SELECT usage_count FROM PromptCache WHERE parameters_hash = ?',
        [hash]
      );

      const usageCount = existing ? existing.usage_count + 1 : 1;

      const result = await this.connection.execute(sql, [
        hash,
        fullPrompt,
        now,
        now,
        usageCount
      ]);

      if (!result.success) {
        throw new DatabaseError('Failed to cache prompt', sql, [hash, fullPrompt]);
      }

      return hash;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to cache prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { params, fullPrompt }
      );
    }
  }

  /**
   * Update cache usage statistics
   */
  private async updateCacheUsage(hash: string): Promise<void> {
    try {
      const sql = `
        UPDATE PromptCache 
        SET last_used = ?, usage_count = usage_count + 1
        WHERE parameters_hash = ?
      `;

      await this.connection.execute(sql, [new Date().toISOString(), hash]);
    } catch (error) {
      // Don't throw error for usage updates to avoid breaking cache hits
      console.warn('Failed to update cache usage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    averageUsageCount: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    mostUsedEntry: { hash: string; count: number } | null;
  }> {
    try {
      // Get basic stats
      const basicStatsSql = `
        SELECT 
          COUNT(*) as total_entries,
          SUM(usage_count) as total_hits,
          AVG(usage_count) as avg_usage,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM PromptCache
      `;

      const basicStats = await this.connection.first<{
        total_entries: number;
        total_hits: number;
        avg_usage: number;
        oldest: string;
        newest: string;
      }>(basicStatsSql);

      // Get most used entry
      const mostUsedSql = `
        SELECT parameters_hash, usage_count
        FROM PromptCache
        ORDER BY usage_count DESC
        LIMIT 1
      `;

      const mostUsed = await this.connection.first<{
        parameters_hash: string;
        usage_count: number;
      }>(mostUsedSql);

      return {
        totalEntries: basicStats?.total_entries || 0,
        totalHits: basicStats?.total_hits || 0,
        averageUsageCount: basicStats?.avg_usage || 0,
        oldestEntry: basicStats?.oldest || null,
        newestEntry: basicStats?.newest || null,
        mostUsedEntry: mostUsed ? {
          hash: mostUsed.parameters_hash,
          count: mostUsed.usage_count
        } : null
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all cached entries with pagination
   */
  async getCachedEntries(
    limit: number = 50,
    offset: number = 0,
    orderBy: 'created_at' | 'last_used' | 'usage_count' = 'last_used',
    orderDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<PromptCacheRecord[]> {
    try {
      const sql = `
        SELECT parameters_hash, full_prompt, created_at, last_used, usage_count
        FROM PromptCache
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ? OFFSET ?
      `;

      const results = await this.connection.all<PromptCacheRecord>(sql, [limit, offset]);
      return results.map(result => PromptCacheRecordSchema.parse(result));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cached entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { limit, offset, orderBy, orderDirection }
      );
    }
  }

  /**
   * Clean up old cache entries
   */
  async cleanupOldEntries(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const sql = `
        DELETE FROM PromptCache 
        WHERE last_used < ?
      `;

      const result = await this.connection.execute(sql, [cutoffDate.toISOString()]);
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to cleanup old cache entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { daysOld }
      );
    }
  }

  /**
   * Clean up least used entries to maintain cache size
   */
  async cleanupLeastUsed(keepCount: number = 1000): Promise<number> {
    try {
      const sql = `
        DELETE FROM PromptCache 
        WHERE parameters_hash NOT IN (
          SELECT parameters_hash 
          FROM PromptCache 
          ORDER BY usage_count DESC, last_used DESC 
          LIMIT ?
        )
      `;

      const result = await this.connection.execute(sql, [keepCount]);
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to cleanup least used entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { keepCount }
      );
    }
  }

  /**
   * Invalidate cache entry by parameters
   */
  async invalidateCache(params: ImageGenerationParams): Promise<boolean> {
    try {
      const hash = this.generateParametersHash(params);
      
      const sql = 'DELETE FROM PromptCache WHERE parameters_hash = ?';
      const result = await this.connection.execute(sql, [hash]);
      
      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { params }
      );
    }
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<number> {
    try {
      const sql = 'DELETE FROM PromptCache';
      const result = await this.connection.execute(sql);
      
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get cache hit rate for analytics
   */
  async getCacheHitRate(hours: number = 24): Promise<{
    totalRequests: number;
    cacheHits: number;
    hitRate: number;
    period: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      // This would require tracking cache misses in a separate table or log
      // For now, we'll return usage-based statistics
      const sql = `
        SELECT 
          COUNT(*) as entries_used,
          SUM(usage_count) as total_usage
        FROM PromptCache
        WHERE last_used >= ?
      `;

      const result = await this.connection.first<{
        entries_used: number;
        total_usage: number;
      }>(sql, [cutoffDate.toISOString()]);

      // Estimate hit rate based on usage patterns
      // This is a simplified calculation - in production you'd want to track actual requests
      const entriesUsed = result?.entries_used || 0;
      const totalUsage = result?.total_usage || 0;
      const estimatedRequests = totalUsage + entriesUsed; // Hits + estimated misses
      const hitRate = estimatedRequests > 0 ? (totalUsage / estimatedRequests) * 100 : 0;

      return {
        totalRequests: estimatedRequests,
        cacheHits: totalUsage,
        hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
        period: `${hours} hours`
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cache hit rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { hours }
      );
    }
  }

  /**
   * Warm up cache with common parameter combinations
   */
  async warmupCache(commonCombinations: Array<{
    params: ImageGenerationParams;
    prompt: string;
  }>): Promise<number> {
    let cachedCount = 0;
    let hasSystemError = false;
    let systemError: Error | null = null;

    for (const combination of commonCombinations) {
      try {
        await this.cachePrompt(combination.params, combination.prompt);
        cachedCount++;
      } catch (error) {
        // If it's a system-level database error, we should throw it
        if (error instanceof DatabaseError && error.message.includes('Database error')) {
          hasSystemError = true;
          systemError = error;
          break;
        }
        // Continue with other combinations for individual cache failures
        console.warn('Failed to cache combination:', error);
      }
    }

    // If we encountered a system error, throw it
    if (hasSystemError && systemError) {
      throw new DatabaseError(
        `Failed to warmup cache: ${systemError.message}`,
        undefined,
        { combinationsCount: commonCombinations.length }
      );
    }

    return cachedCount;
  }

  /**
   * Get cache entry by hash (for debugging)
   */
  async getCacheEntryByHash(hash: string): Promise<PromptCacheRecord | null> {
    try {
      const sql = `
        SELECT parameters_hash, full_prompt, created_at, last_used, usage_count
        FROM PromptCache 
        WHERE parameters_hash = ?
      `;

      const result = await this.connection.first<PromptCacheRecord>(sql, [hash]);
      
      if (!result) {
        return null;
      }

      return PromptCacheRecordSchema.parse(result);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cache entry by hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { hash }
      );
    }
  }

  /**
   * Check if parameters would result in a cache hit (without updating usage)
   */
  async wouldCacheHit(params: ImageGenerationParams): Promise<boolean> {
    try {
      const hash = this.generateParametersHash(params);
      
      const sql = 'SELECT 1 FROM PromptCache WHERE parameters_hash = ? LIMIT 1';
      const result = await this.connection.first(sql, [hash]);
      
      return result !== null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check cache hit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { params }
      );
    }
  }

  /**
   * Get the hash that would be generated for given parameters (for debugging)
   */
  getParametersHash(params: ImageGenerationParams): string {
    return this.generateParametersHash(params);
  }
}