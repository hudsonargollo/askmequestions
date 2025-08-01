/**
 * Production Monitoring and Health Check System
 * Provides comprehensive monitoring, alerting, and health checks for production environment
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    storage: HealthCheck;
    externalServices: HealthCheck;
    memory: HealthCheck;
    performance: HealthCheck;
  };
  metadata: {
    version: string;
    environment: string;
    region: string;
  };
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface MetricsData {
  timestamp: string;
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
    };
    images: {
      generated: number;
      cached: number;
      failed: number;
      averageGenerationTime: number;
    };
    storage: {
      totalObjects: number;
      totalSize: number;
      uploadSuccess: number;
      uploadFailures: number;
    };
    database: {
      queries: number;
      averageQueryTime: number;
      connections: number;
      errors: number;
    };
  };
}

export class ProductionMonitoring {
  private env: any;
  private startTime: number;

  constructor(env: any) {
    this.env = env;
    this.startTime = Date.now();
  }

  /**
   * Comprehensive health check for all system components
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    const [database, storage, externalServices, memory, performance] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkExternalServices(),
      this.checkMemory(),
      this.checkPerformance()
    ]);

    const checks = {
      database: this.getCheckResult(database),
      storage: this.getCheckResult(storage),
      externalServices: this.getCheckResult(externalServices),
      memory: this.getCheckResult(memory),
      performance: this.getCheckResult(performance)
    };

    // Determine overall status
    const hasFailures = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
    
    const status = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

    return {
      status,
      timestamp,
      checks,
      metadata: {
        version: '1.0.0',
        environment: this.env.ENVIRONMENT || 'production',
        region: 'global'
      }
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const result = await this.env.IMAGE_DB.prepare('SELECT 1 as test').first();
      
      if (!result || result.test !== 1) {
        return {
          status: 'fail',
          message: 'Database connectivity test failed',
          responseTime: Date.now() - startTime
        };
      }

      // Test table existence and basic query
      const imageCount = await this.env.IMAGE_DB.prepare(
        'SELECT COUNT(*) as count FROM GeneratedImages WHERE created_at > datetime("now", "-1 hour")'
      ).first();

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 1000 ? 'warn' : 'pass',
        responseTime,
        message: responseTime > 1000 ? 'Database response time is slow' : 'Database is healthy',
        details: {
          recentImages: imageCount?.count || 0,
          queryTime: responseTime
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * Check R2 storage connectivity and performance
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test bucket access by listing objects (limited)
      const testKey = `health-check/test-${Date.now()}.txt`;
      const testContent = new TextEncoder().encode('health-check-test');
      
      // Test write
      await this.env.IMAGE_BUCKET.put(testKey, testContent, {
        httpMetadata: {
          contentType: 'text/plain',
          cacheControl: 'no-cache'
        }
      });

      // Test read
      const object = await this.env.IMAGE_BUCKET.get(testKey);
      
      if (!object) {
        return {
          status: 'fail',
          message: 'Storage read test failed',
          responseTime: Date.now() - startTime
        };
      }

      // Clean up test object
      await this.env.IMAGE_BUCKET.delete(testKey);

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 2000 ? 'warn' : 'pass',
        responseTime,
        message: responseTime > 2000 ? 'Storage response time is slow' : 'Storage is healthy',
        details: {
          writeReadTime: responseTime
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * Check external AI services availability
   */
  private async checkExternalServices(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // This is a simplified check - in production you'd want to check actual service endpoints
      const serviceType = this.env.IMAGE_GENERATION_SERVICE || 'midjourney';
      
      // For now, we'll just check if the service configuration is present
      const hasApiKey = !!(
        this.env.MIDJOURNEY_API_KEY || 
        this.env.DALLE_API_KEY || 
        this.env.STABLE_DIFFUSION_API_KEY
      );

      if (!hasApiKey) {
        return {
          status: 'fail',
          message: 'No API keys configured for external services',
          responseTime: Date.now() - startTime
        };
      }

      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'External services configuration is healthy',
        details: {
          configuredService: serviceType,
          hasApiKey: hasApiKey
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * Check memory usage and performance
   */
  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // In Cloudflare Workers, we don't have direct access to memory stats
      // But we can check if we're running within reasonable time limits
      const uptime = Date.now() - this.startTime;
      
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        message: 'Memory check completed',
        details: {
          uptime: uptime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * Check overall system performance
   */
  private async checkPerformance(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test a simple database query performance
      const dbStart = Date.now();
      await this.env.IMAGE_DB.prepare('SELECT COUNT(*) FROM GeneratedImages LIMIT 1').first();
      const dbTime = Date.now() - dbStart;

      // Test R2 list operation performance
      const r2Start = Date.now();
      await this.env.IMAGE_BUCKET.list({ limit: 1 });
      const r2Time = Date.now() - r2Start;

      const totalTime = Date.now() - startTime;
      const isPerformant = dbTime < 500 && r2Time < 1000 && totalTime < 2000;

      return {
        status: isPerformant ? 'pass' : 'warn',
        responseTime: totalTime,
        message: isPerformant ? 'Performance is optimal' : 'Performance is degraded',
        details: {
          databaseQueryTime: dbTime,
          storageListTime: r2Time,
          totalCheckTime: totalTime
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * Collect system metrics for monitoring
   */
  async collectMetrics(): Promise<MetricsData> {
    const timestamp = new Date().toISOString();
    
    try {
      // Get recent statistics from database
      const recentStats = await this.env.IMAGE_DB.prepare(`
        SELECT 
          COUNT(*) as total_images,
          COUNT(CASE WHEN status = 'COMPLETE' THEN 1 END) as successful_images,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_images,
          AVG(CASE WHEN generation_time_ms IS NOT NULL THEN generation_time_ms END) as avg_generation_time,
          COUNT(CASE WHEN created_at > datetime('now', '-1 hour') THEN 1 END) as recent_images
        FROM GeneratedImages 
        WHERE created_at > datetime('now', '-24 hours')
      `).first();

      const cacheStats = await this.env.IMAGE_DB.prepare(`
        SELECT COUNT(*) as cached_prompts 
        FROM PromptCache 
        WHERE created_at > datetime('now', '-24 hours')
      `).first();

      return {
        timestamp,
        metrics: {
          requests: {
            total: recentStats?.recent_images || 0,
            successful: recentStats?.successful_images || 0,
            failed: recentStats?.failed_images || 0,
            averageResponseTime: 0 // Would need to track this separately
          },
          images: {
            generated: recentStats?.total_images || 0,
            cached: cacheStats?.cached_prompts || 0,
            failed: recentStats?.failed_images || 0,
            averageGenerationTime: recentStats?.avg_generation_time || 0
          },
          storage: {
            totalObjects: 0, // Would need to track this
            totalSize: 0, // Would need to track this
            uploadSuccess: recentStats?.successful_images || 0,
            uploadFailures: recentStats?.failed_images || 0
          },
          database: {
            queries: 0, // Would need to track this
            averageQueryTime: 0, // Would need to track this
            connections: 1, // Single connection in Workers
            errors: 0 // Would need to track this
          }
        }
      };
    } catch (error) {
      // Return empty metrics on error
      return {
        timestamp,
        metrics: {
          requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
          images: { generated: 0, cached: 0, failed: 0, averageGenerationTime: 0 },
          storage: { totalObjects: 0, totalSize: 0, uploadSuccess: 0, uploadFailures: 0 },
          database: { queries: 0, averageQueryTime: 0, connections: 0, errors: 1 }
        }
      };
    }
  }

  /**
   * Log metrics to analytics engine (if available)
   */
  async logMetrics(metrics: MetricsData): Promise<void> {
    try {
      if (this.env.IMAGE_ANALYTICS) {
        await this.env.IMAGE_ANALYTICS.writeDataPoint({
          blobs: [JSON.stringify(metrics)],
          doubles: [
            metrics.metrics.requests.total,
            metrics.metrics.images.generated,
            metrics.metrics.images.averageGenerationTime
          ],
          indexes: [metrics.timestamp]
        });
      }
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }

  /**
   * Helper method to extract check result from Promise.allSettled result
   */
  private getCheckResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'fail',
        message: `Check failed: ${result.reason}`,
        details: { error: String(result.reason) }
      };
    }
  }
}

/**
 * Create health check endpoint handler
 */
export function createHealthCheckHandler(env: any) {
  return async (): Promise<Response> => {
    const monitoring = new ProductionMonitoring(env);
    
    try {
      const healthCheck = await monitoring.performHealthCheck();
      
      const statusCode = healthCheck.status === 'healthy' ? 200 : 
                        healthCheck.status === 'degraded' ? 200 : 503;
      
      return new Response(JSON.stringify(healthCheck, null, 2), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': healthCheck.status
        }
      });
    } catch (error) {
      const errorResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {}
      };
      
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': 'unhealthy'
        }
      });
    }
  };
}

/**
 * Create metrics endpoint handler
 */
export function createMetricsHandler(env: any) {
  return async (): Promise<Response> => {
    const monitoring = new ProductionMonitoring(env);
    
    try {
      const metrics = await monitoring.collectMetrics();
      
      // Log metrics for monitoring
      await monitoring.logMetrics(metrics);
      
      return new Response(JSON.stringify(metrics, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } catch (error) {
      const errorResponse = {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
  };
}