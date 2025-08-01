import { GeneratedImageRecord, PromptCacheRecord } from './types';

// Cloudflare D1 types
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }
  
  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }
  
  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta: {
      duration: number;
      size_after: number;
      rows_read: number;
      rows_written: number;
    };
    changes?: number;
    duration?: number;
    last_row_id?: number;
  }
  
  interface D1ExecResult {
    count: number;
    duration: number;
  }
}

/**
 * Database connection wrapper for Cloudflare D1 with prepared statement support
 * Provides utilities for common database operations with error handling and connection pooling
 */
export class DatabaseConnection {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
  }

  /**
   * Execute a prepared statement with parameters
   */
  async execute(sql: string, params: any[] = []): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(sql);
      return await stmt.bind(...params).run();
    } catch (error) {
      throw new DatabaseError(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`, sql, params);
    }
  }

  /**
   * Execute a query and return the first result
   */
  async first<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql);
      const result = await stmt.bind(...params).first();
      return result as T | null;
    } catch (error) {
      throw new DatabaseError(`Failed to execute first query: ${error instanceof Error ? error.message : 'Unknown error'}`, sql, params);
    }
  }

  /**
   * Execute a query and return all results
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql);
      const result = await stmt.bind(...params).all();
      return result.results as T[];
    } catch (error) {
      throw new DatabaseError(`Failed to execute all query: ${error instanceof Error ? error.message : 'Unknown error'}`, sql, params);
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<D1Result[]> {
    try {
      const preparedStatements = statements.map(({ sql, params = [] }) => {
        return this.db.prepare(sql).bind(...params);
      });
      
      return await this.db.batch(preparedStatements);
    } catch (error) {
      throw new DatabaseError(`Failed to execute batch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'BATCH', statements);
    }
  }

  /**
   * Get database info and statistics
   */
  async getInfo(): Promise<any> {
    try {
      // D1 doesn't have a direct info method, so we'll return basic connection status
      const result = await this.first('SELECT 1 as connected');
      return {
        connected: result?.connected === 1,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get database info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
  public readonly sql?: string;
  public readonly params?: any;
  public readonly timestamp: string;

  constructor(message: string, sql?: string, params?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.sql = sql;
    this.params = params;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      sql: this.sql,
      params: this.params,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Database utility functions for common operations
 */
export class DatabaseUtils {
  private connection: DatabaseConnection;

  constructor(database: D1Database) {
    this.connection = new DatabaseConnection(database);
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.connection.first(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result !== null;
    } catch (error) {
      throw new DatabaseError(`Failed to check if table exists: ${tableName}`, undefined, { tableName });
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    try {
      return await this.connection.all(`PRAGMA table_info(${tableName})`);
    } catch (error) {
      throw new DatabaseError(`Failed to get table schema: ${tableName}`, undefined, { tableName });
    }
  }

  /**
   * Get table row count
   */
  async getRowCount(tableName: string, whereClause?: string, params?: any[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    const queryParams: any[] = [];

    try {
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
        if (params) {
          queryParams.push(...params);
        }
      }

      const result = await this.connection.first<{ count: number }>(sql, queryParams);
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to get row count for table: ${tableName}`, sql, queryParams);
    }
  }

  /**
   * Check database health and connectivity
   */
  async healthCheck(): Promise<{
    connected: boolean;
    tablesExist: boolean;
    generatedImagesCount: number;
    promptCacheCount: number;
    timestamp: string;
  }> {
    try {
      const info = await this.connection.getInfo();
      const generatedImagesExists = await this.tableExists('GeneratedImages');
      const promptCacheExists = await this.tableExists('PromptCache');
      
      let generatedImagesCount = 0;
      let promptCacheCount = 0;

      if (generatedImagesExists) {
        generatedImagesCount = await this.getRowCount('GeneratedImages');
      }

      if (promptCacheExists) {
        promptCacheCount = await this.getRowCount('PromptCache');
      }

      return {
        connected: info.connected,
        tablesExist: generatedImagesExists && promptCacheExists,
        generatedImagesCount,
        promptCacheCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new DatabaseError(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old records based on age
   */
  async cleanupOldRecords(tableName: string, dateColumn: string, daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.connection.execute(
        `DELETE FROM ${tableName} WHERE ${dateColumn} < ?`,
        [cutoffDate.toISOString()]
      );

      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to cleanup old records from ${tableName}`, undefined, { tableName, dateColumn, daysOld });
    }
  }

  /**
   * Get connection instance for direct access
   */
  getConnection(): DatabaseConnection {
    return this.connection;
  }
}

/**
 * Connection pool manager for D1 databases
 * Note: D1 handles connection pooling internally, but this provides a consistent interface
 */
export class ConnectionPool {
  private connections: Map<string, DatabaseConnection> = new Map();

  /**
   * Get or create a database connection
   */
  getConnection(name: string, database: D1Database): DatabaseConnection {
    if (!this.connections.has(name)) {
      this.connections.set(name, new DatabaseConnection(database));
    }
    return this.connections.get(name)!;
  }

  /**
   * Get database utilities for a connection
   */
  getUtils(name: string, database: D1Database): DatabaseUtils {
    this.getConnection(name, database);
    return new DatabaseUtils(database);
  }

  /**
   * Close all connections (cleanup)
   */
  closeAll(): void {
    this.connections.clear();
  }

  /**
   * Get connection statistics
   */
  getStats(): { connectionCount: number; connectionNames: string[] } {
    return {
      connectionCount: this.connections.size,
      connectionNames: Array.from(this.connections.keys())
    };
  }
}

// Global connection pool instance
export const connectionPool = new ConnectionPool();

/**
 * Helper function to get database connection with error handling
 */
export function getDatabaseConnection(database: D1Database): DatabaseConnection {
  if (!database) {
    throw new DatabaseError('Database instance is required');
  }
  return new DatabaseConnection(database);
}

/**
 * Helper function to get database utilities with error handling
 */
export function getDatabaseUtils(database: D1Database): DatabaseUtils {
  if (!database) {
    throw new DatabaseError('Database instance is required');
  }
  return new DatabaseUtils(database);
}

/**
 * Database layer for Capitão Caverna Image Engine operations
 * Provides high-level methods for managing generated images and prompt cache
 */
export class DatabaseLayer {
  private connection: DatabaseConnection;

  constructor(database: D1Database) {
    this.connection = new DatabaseConnection(database);
  }

  /**
   * Insert a new generated image record
   */
  async insertGeneratedImage(record: GeneratedImageRecord): Promise<string> {
    try {
      const sql = `
        INSERT INTO GeneratedImages (
          image_id, user_id, r2_object_key, prompt_parameters, 
          status, error_message, generation_time_ms, service_used, public_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.connection.execute(sql, [
        record.image_id,
        record.user_id,
        record.r2_object_key,
        record.prompt_parameters,
        record.status,
        record.error_message,
        record.generation_time_ms,
        record.service_used,
        record.public_url
      ]);

      return record.image_id;
    } catch (error) {
      throw new DatabaseError(`Failed to insert generated image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update image status
   */
  async updateImageStatus(imageId: string, status: 'PENDING' | 'COMPLETE' | 'FAILED', errorMessage?: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE GeneratedImages 
        SET status = ?, error_message = ?
        WHERE image_id = ?
      `;
      
      const result = await this.connection.execute(sql, [status, errorMessage || null, imageId]);
      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to update image status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update generated image with complete information
   */
  async updateGeneratedImage(imageId: string, updates: {
    status?: 'PENDING' | 'COMPLETE' | 'FAILED';
    r2_object_key?: string;
    public_url?: string;
    generation_time_ms?: number;
    service_used?: string;
    error_message?: string;
  }): Promise<boolean> {
    try {
      const setParts: string[] = [];
      const params: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setParts.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (setParts.length === 0) {
        return false;
      }

      params.push(imageId);
      const sql = `UPDATE GeneratedImages SET ${setParts.join(', ')} WHERE image_id = ?`;
      
      const result = await this.connection.execute(sql, params);
      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to update generated image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a generated image by ID
   */
  async getImageById(imageId: string): Promise<GeneratedImageRecord | null> {
    return this.getGeneratedImage(imageId);
  }

  /**
   * Get a generated image by ID
   */
  async getGeneratedImage(imageId: string): Promise<GeneratedImageRecord | null> {
    try {
      const sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, created_at,
               status, error_message, generation_time_ms, service_used, public_url
        FROM GeneratedImages 
        WHERE image_id = ?
      `;
      
      return await this.connection.first<GeneratedImageRecord>(sql, [imageId]);
    } catch (error) {
      throw new DatabaseError(`Failed to get generated image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user images with filtering and pagination (overloaded for compatibility)
   */
  async getUserImages(userId: string, limit?: number, offset?: number): Promise<GeneratedImageRecord[]>;
  async getUserImages(userId: string, options: {
    limit?: number;
    offset?: number;
    status?: 'PENDING' | 'COMPLETE' | 'FAILED';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<GeneratedImageRecord[]>;
  async getUserImages(userId: string, limitOrOptions?: number | {
    limit?: number;
    offset?: number;
    status?: 'PENDING' | 'COMPLETE' | 'FAILED';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, offset?: number): Promise<GeneratedImageRecord[]> {
    // Handle overloaded parameters
    let options: {
      limit?: number;
      offset?: number;
      status?: 'PENDING' | 'COMPLETE' | 'FAILED';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };

    if (typeof limitOrOptions === 'number') {
      options = { limit: limitOrOptions, offset: offset || 0 };
    } else {
      options = limitOrOptions || {};
    }
    try {
      const {
        limit = 20,
        offset = 0,
        status,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      let sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, created_at,
               status, error_message, generation_time_ms, service_used, public_url
        FROM GeneratedImages 
        WHERE user_id = ?
      `;
      
      const params: any[] = [userId];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      return await this.connection.all<GeneratedImageRecord>(sql, params);
    } catch (error) {
      throw new DatabaseError(`Failed to get user images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user image count for pagination
   */
  async getUserImageCount(userId: string, status?: 'PENDING' | 'COMPLETE' | 'FAILED'): Promise<number> {
    try {
      let sql = 'SELECT COUNT(*) as count FROM GeneratedImages WHERE user_id = ?';
      const params: any[] = [userId];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      const result = await this.connection.first<{ count: number }>(sql, params);
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to get user image count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a generated image (alias for compatibility)
   */
  async deleteImage(imageId: string): Promise<boolean> {
    return this.deleteGeneratedImage(imageId);
  }

  /**
   * Delete a generated image
   */
  async deleteGeneratedImage(imageId: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM GeneratedImages WHERE image_id = ?';
      const result = await this.connection.execute(sql, [imageId]);
      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to delete generated image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create prompt cache entry
   */
  async getPromptCache(parametersHash: string): Promise<PromptCacheRecord | null> {
    try {
      const sql = `
        SELECT parameters_hash, full_prompt, created_at, last_used, usage_count
        FROM PromptCache 
        WHERE parameters_hash = ?
      `;
      
      return await this.connection.first<PromptCacheRecord>(sql, [parametersHash]);
    } catch (error) {
      throw new DatabaseError(`Failed to get prompt cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Insert or update prompt cache
   */
  async upsertPromptCache(parametersHash: string, fullPrompt: string): Promise<void> {
    try {
      const sql = `
        INSERT INTO PromptCache (parameters_hash, full_prompt, created_at, last_used, usage_count)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
        ON CONFLICT(parameters_hash) DO UPDATE SET
          last_used = CURRENT_TIMESTAMP,
          usage_count = usage_count + 1
      `;
      
      await this.connection.execute(sql, [parametersHash, fullPrompt]);
    } catch (error) {
      throw new DatabaseError(`Failed to upsert prompt cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old prompt cache entries
   */
  async cleanupPromptCache(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const sql = 'DELETE FROM PromptCache WHERE last_used < ?';
      const result = await this.connection.execute(sql, [cutoffDate.toISOString()]);
      
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to cleanup prompt cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalImages: number;
    pendingImages: number;
    completeImages: number;
    failedImages: number;
    cacheEntries: number;
    avgGenerationTime: number;
  }> {
    try {
      const [imageStats, cacheCount, avgTime] = await Promise.all([
        this.connection.first<{
          total: number;
          pending: number;
          complete: number;
          failed: number;
        }>(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) as complete,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM GeneratedImages
        `),
        this.connection.first<{ count: number }>('SELECT COUNT(*) as count FROM PromptCache'),
        this.connection.first<{ avg: number }>(`
          SELECT AVG(generation_time_ms) as avg 
          FROM GeneratedImages 
          WHERE generation_time_ms IS NOT NULL
        `)
      ]);

      return {
        totalImages: imageStats?.total || 0,
        pendingImages: imageStats?.pending || 0,
        completeImages: imageStats?.complete || 0,
        failedImages: imageStats?.failed || 0,
        cacheEntries: cacheCount?.count || 0,
        avgGenerationTime: avgTime?.avg || 0
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's average generation time
   */
  async getUserAverageGenerationTime(userId: string): Promise<number> {
    try {
      const result = await this.connection.first<{ avg: number }>(`
        SELECT AVG(generation_time_ms) as avg 
        FROM GeneratedImages 
        WHERE user_id = ? AND generation_time_ms IS NOT NULL
      `, [userId]);
      
      return result?.avg || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to get user average generation time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's parameter usage statistics
   */
  async getUserParameterStats(userId: string): Promise<any> {
    try {
      const images = await this.connection.all<{ prompt_parameters: string }>(`
        SELECT prompt_parameters 
        FROM GeneratedImages 
        WHERE user_id = ? AND status = 'COMPLETE'
      `, [userId]);

      const stats = {
        poses: {} as Record<string, number>,
        outfits: {} as Record<string, number>,
        footwear: {} as Record<string, number>,
        props: {} as Record<string, number>
      };

      images.forEach(img => {
        try {
          const params = JSON.parse(img.prompt_parameters);
          if (params.pose) stats.poses[params.pose] = (stats.poses[params.pose] || 0) + 1;
          if (params.outfit) stats.outfits[params.outfit] = (stats.outfits[params.outfit] || 0) + 1;
          if (params.footwear) stats.footwear[params.footwear] = (stats.footwear[params.footwear] || 0) + 1;
          if (params.prop) stats.props[params.prop] = (stats.props[params.prop] || 0) + 1;
        } catch (e) {
          // Skip invalid JSON
        }
      });

      return {
        most_used_pose: Object.keys(stats.poses).reduce((a, b) => stats.poses[a] > stats.poses[b] ? a : b, ''),
        most_used_outfit: Object.keys(stats.outfits).reduce((a, b) => stats.outfits[a] > stats.outfits[b] ? a : b, ''),
        most_used_footwear: Object.keys(stats.footwear).reduce((a, b) => stats.footwear[a] > stats.footwear[b] ? a : b, ''),
        most_used_prop: Object.keys(stats.props).reduce((a, b) => stats.props[a] > stats.props[b] ? a : b, ''),
        pose_distribution: stats.poses,
        outfit_distribution: stats.outfits,
        footwear_distribution: stats.footwear,
        prop_distribution: stats.props
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get user parameter stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search user images by parameters
   */
  async searchUserImagesByParameters(userId: string, criteria: {
    pose?: string;
    outfit?: string;
    footwear?: string;
    prop?: string;
    frameType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<GeneratedImageRecord[]> {
    try {
      let sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, created_at,
               status, error_message, generation_time_ms, service_used, public_url
        FROM GeneratedImages 
        WHERE user_id = ?
      `;
      
      const params: any[] = [userId];

      // Add parameter-based filtering
      if (criteria.pose) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.pose') = ?`;
        params.push(criteria.pose);
      }
      
      if (criteria.outfit) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.outfit') = ?`;
        params.push(criteria.outfit);
      }
      
      if (criteria.footwear) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.footwear') = ?`;
        params.push(criteria.footwear);
      }
      
      if (criteria.prop) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.prop') = ?`;
        params.push(criteria.prop);
      }
      
      if (criteria.frameType) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.frameType') = ?`;
        params.push(criteria.frameType);
      }

      if (criteria.status) {
        sql += ` AND status = ?`;
        params.push(criteria.status);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(criteria.limit || 20, criteria.offset || 0);

      return await this.connection.all<GeneratedImageRecord>(sql, params);
    } catch (error) {
      throw new DatabaseError(`Failed to search user images by parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count user images by parameters
   */
  async countUserImagesByParameters(userId: string, criteria: {
    pose?: string;
    outfit?: string;
    footwear?: string;
    prop?: string;
    frameType?: string;
    status?: string;
  }): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM GeneratedImages WHERE user_id = ?`;
      const params: any[] = [userId];

      // Add the same filtering as search
      if (criteria.pose) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.pose') = ?`;
        params.push(criteria.pose);
      }
      
      if (criteria.outfit) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.outfit') = ?`;
        params.push(criteria.outfit);
      }
      
      if (criteria.footwear) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.footwear') = ?`;
        params.push(criteria.footwear);
      }
      
      if (criteria.prop) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.prop') = ?`;
        params.push(criteria.prop);
      }
      
      if (criteria.frameType) {
        sql += ` AND JSON_EXTRACT(prompt_parameters, '$.frameType') = ?`;
        params.push(criteria.frameType);
      }

      if (criteria.status) {
        sql += ` AND status = ?`;
        params.push(criteria.status);
      }

      const result = await this.connection.first<{ count: number }>(sql, params);
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to count user images by parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top image generators (admin function)
   */
  async getTopImageGenerators(limit: number = 10): Promise<any[]> {
    try {
      return await this.connection.all<any>(`
        SELECT 
          user_id,
          COUNT(*) as total_images,
          SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) as successful_images,
          AVG(generation_time_ms) as avg_generation_time,
          MAX(created_at) as last_generation
        FROM GeneratedImages 
        GROUP BY user_id 
        ORDER BY total_images DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      throw new DatabaseError(`Failed to get top image generators: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent activity (admin function)
   */
  async getRecentActivity(limit: number = 50): Promise<any[]> {
    try {
      return await this.connection.all<any>(`
        SELECT 
          image_id,
          user_id,
          status,
          created_at,
          generation_time_ms,
          service_used
        FROM GeneratedImages 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      throw new DatabaseError(`Failed to get recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get service usage statistics (admin function)
   */
  async getServiceUsageStats(): Promise<any> {
    try {
      const serviceStats = await this.connection.all<any>(`
        SELECT 
          service_used,
          COUNT(*) as usage_count,
          AVG(generation_time_ms) as avg_time,
          SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) as successful_count,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
        FROM GeneratedImages 
        WHERE service_used IS NOT NULL
        GROUP BY service_used
      `);

      return serviceStats.reduce((acc, stat) => {
        acc[stat.service_used] = {
          usage_count: stat.usage_count,
          avg_generation_time: stat.avg_time,
          successful_count: stat.successful_count,
          failed_count: stat.failed_count,
          success_rate: stat.usage_count > 0 ? Math.round((stat.successful_count / stat.usage_count) * 100) : 0
        };
        return acc;
      }, {});
    } catch (error) {
      throw new DatabaseError(`Failed to get service usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up failed images older than specified days
   */
  async cleanupFailedImages(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.connection.execute(`
        DELETE FROM GeneratedImages 
        WHERE status = 'FAILED' AND created_at < ?
      `, [cutoffDate.toISOString()]);
      
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to cleanup failed images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}