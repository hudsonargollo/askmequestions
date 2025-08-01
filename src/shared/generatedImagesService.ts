import { 
  GeneratedImageRecord, 
  ImageGenerationParams, 
  GeneratedImageRecordSchema 
} from './types';
import { DatabaseConnection, DatabaseError } from './database';

/**
 * Service for managing GeneratedImages table operations
 * Provides CRUD operations, status updates, and user image queries
 */
export class GeneratedImagesService {
  private connection: DatabaseConnection;

  constructor(database: D1Database) {
    this.connection = new DatabaseConnection(database);
  }

  /**
   * Insert a new generated image record
   */
  async insertGeneratedImage(record: Omit<GeneratedImageRecord, 'created_at'>): Promise<string> {
    try {
      // Validate the record structure
      const validatedRecord = GeneratedImageRecordSchema.omit({ created_at: true }).parse(record);

      const sql = `
        INSERT INTO GeneratedImages (
          image_id, user_id, r2_object_key, prompt_parameters, 
          status, error_message, generation_time_ms, service_used, public_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        validatedRecord.image_id,
        validatedRecord.user_id,
        validatedRecord.r2_object_key,
        validatedRecord.prompt_parameters,
        validatedRecord.status,
        validatedRecord.error_message,
        validatedRecord.generation_time_ms,
        validatedRecord.service_used,
        validatedRecord.public_url
      ];

      const result = await this.connection.execute(sql, params);

      if (!result.success) {
        throw new DatabaseError('Failed to insert generated image record', sql, params);
      }

      return validatedRecord.image_id;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to insert generated image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        record
      );
    }
  }

  /**
   * Get a generated image record by ID
   */
  async getGeneratedImageById(imageId: string): Promise<GeneratedImageRecord | null> {
    try {
      const sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, 
               created_at, status, error_message, generation_time_ms, 
               service_used, public_url
        FROM GeneratedImages 
        WHERE image_id = ?
      `;

      const result = await this.connection.first<GeneratedImageRecord>(sql, [imageId]);
      
      if (!result) {
        return null;
      }

      // Validate the result structure
      return GeneratedImageRecordSchema.parse(result);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get generated image by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { imageId }
      );
    }
  }

  /**
   * Update the status of a generated image
   */
  async updateImageStatus(
    imageId: string, 
    status: 'PENDING' | 'COMPLETE' | 'FAILED',
    errorMessage?: string,
    generationTimeMs?: number,
    publicUrl?: string
  ): Promise<boolean> {
    try {
      const sql = `
        UPDATE GeneratedImages 
        SET status = ?, error_message = ?, generation_time_ms = ?, public_url = ?
        WHERE image_id = ?
      `;

      const params = [status, errorMessage || null, generationTimeMs || null, publicUrl || null, imageId];
      const result = await this.connection.execute(sql, params);

      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update image status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { imageId, status, errorMessage, generationTimeMs, publicUrl }
      );
    }
  }

  /**
   * Get all images for a specific user with pagination
   */
  async getUserImages(
    userId: string, 
    limit: number = 50, 
    offset: number = 0,
    status?: 'PENDING' | 'COMPLETE' | 'FAILED'
  ): Promise<GeneratedImageRecord[]> {
    try {
      let sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, 
               created_at, status, error_message, generation_time_ms, 
               service_used, public_url
        FROM GeneratedImages 
        WHERE user_id = ?
      `;
      
      const params: any[] = [userId];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const results = await this.connection.all<GeneratedImageRecord>(sql, params);
      
      // Validate each result
      return results.map(result => GeneratedImageRecordSchema.parse(result));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { userId, limit, offset, status }
      );
    }
  }

  /**
   * Get count of user images by status
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
      throw new DatabaseError(
        `Failed to get user image count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { userId, status }
      );
    }
  }

  /**
   * Find images by parameters (for duplicate detection)
   */
  async getImageByParameters(
    userId: string,
    params: ImageGenerationParams
  ): Promise<GeneratedImageRecord | null> {
    try {
      const paramsJson = JSON.stringify(params);
      
      const sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, 
               created_at, status, error_message, generation_time_ms, 
               service_used, public_url
        FROM GeneratedImages 
        WHERE user_id = ? AND prompt_parameters = ? AND status = 'COMPLETE'
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await this.connection.first<GeneratedImageRecord>(sql, [userId, paramsJson]);
      
      if (!result) {
        return null;
      }

      return GeneratedImageRecordSchema.parse(result);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get image by parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { userId, params }
      );
    }
  }

  /**
   * Delete a generated image record
   */
  async deleteGeneratedImage(imageId: string, userId?: string): Promise<boolean> {
    try {
      let sql = 'DELETE FROM GeneratedImages WHERE image_id = ?';
      const params: any[] = [imageId];

      // Optional user check for security
      if (userId) {
        sql += ' AND user_id = ?';
        params.push(userId);
      }

      const result = await this.connection.execute(sql, params);
      return (result.changes || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete generated image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { imageId, userId }
      );
    }
  }

  /**
   * Get images by service used (for analytics)
   */
  async getImagesByService(
    serviceUsed: 'midjourney' | 'dalle' | 'stable-diffusion',
    limit: number = 100
  ): Promise<GeneratedImageRecord[]> {
    try {
      const sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, 
               created_at, status, error_message, generation_time_ms, 
               service_used, public_url
        FROM GeneratedImages 
        WHERE service_used = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `;

      const results = await this.connection.all<GeneratedImageRecord>(sql, [serviceUsed, limit]);
      return results.map(result => GeneratedImageRecordSchema.parse(result));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get images by service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { serviceUsed, limit }
      );
    }
  }

  /**
   * Get generation statistics for analytics
   */
  async getGenerationStats(userId?: string): Promise<{
    totalImages: number;
    completedImages: number;
    failedImages: number;
    pendingImages: number;
    averageGenerationTime: number;
    serviceBreakdown: Record<string, number>;
  }> {
    try {
      let baseWhere = '';
      const params: any[] = [];

      if (userId) {
        baseWhere = 'WHERE user_id = ?';
        params.push(userId);
      }

      // Get basic counts
      const countSql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          AVG(CASE WHEN generation_time_ms IS NOT NULL THEN generation_time_ms ELSE NULL END) as avg_time
        FROM GeneratedImages ${baseWhere}
      `;

      const countResult = await this.connection.first<{
        total: number;
        completed: number;
        failed: number;
        pending: number;
        avg_time: number;
      }>(countSql, params);

      // Get service breakdown
      const serviceSql = `
        SELECT service_used, COUNT(*) as count
        FROM GeneratedImages 
        ${baseWhere}
        GROUP BY service_used
      `;

      const serviceResults = await this.connection.all<{ service_used: string; count: number }>(
        serviceSql, 
        params
      );

      const serviceBreakdown: Record<string, number> = {};
      serviceResults.forEach(row => {
        if (row.service_used) {
          serviceBreakdown[row.service_used] = row.count;
        }
      });

      return {
        totalImages: countResult?.total || 0,
        completedImages: countResult?.completed || 0,
        failedImages: countResult?.failed || 0,
        pendingImages: countResult?.pending || 0,
        averageGenerationTime: countResult?.avg_time || 0,
        serviceBreakdown
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get generation stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { userId }
      );
    }
  }

  /**
   * Clean up old failed or pending records
   */
  async cleanupOldRecords(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const sql = `
        DELETE FROM GeneratedImages 
        WHERE created_at < ? AND status IN ('FAILED', 'PENDING')
      `;

      const result = await this.connection.execute(sql, [cutoffDate.toISOString()]);
      return result.changes || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to cleanup old records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { daysOld }
      );
    }
  }

  /**
   * Get recent activity for a user
   */
  async getRecentActivity(userId: string, hours: number = 24): Promise<GeneratedImageRecord[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const sql = `
        SELECT image_id, user_id, r2_object_key, prompt_parameters, 
               created_at, status, error_message, generation_time_ms, 
               service_used, public_url
        FROM GeneratedImages 
        WHERE user_id = ? AND created_at >= ?
        ORDER BY created_at DESC
      `;

      const results = await this.connection.all<GeneratedImageRecord>(
        sql, 
        [userId, cutoffDate.toISOString()]
      );

      return results.map(result => GeneratedImageRecordSchema.parse(result));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { userId, hours }
      );
    }
  }

  /**
   * Batch update multiple image statuses (for bulk operations)
   */
  async batchUpdateStatus(updates: Array<{
    imageId: string;
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
    errorMessage?: string;
    generationTimeMs?: number;
    publicUrl?: string;
  }>): Promise<number> {
    try {
      const statements = updates.map(update => ({
        sql: `
          UPDATE GeneratedImages 
          SET status = ?, error_message = ?, generation_time_ms = ?, public_url = ?
          WHERE image_id = ?
        `,
        params: [
          update.status,
          update.errorMessage || null,
          update.generationTimeMs || null,
          update.publicUrl || null,
          update.imageId
        ]
      }));

      const results = await this.connection.batch(statements);
      return results.reduce((total, result) => total + (result.changes || 0), 0);
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { updates }
      );
    }
  }
}