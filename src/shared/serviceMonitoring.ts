import { ImageGenerationService } from './imageGenerationService';

/**
 * Health check result for a service
 */
export interface HealthCheckResult {
  serviceName: string;
  isHealthy: boolean;
  responseTime: number;
  timestamp: Date;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Service metrics collected over time
 */
export interface ServiceMetrics {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  uptime: number; // percentage
  lastHealthCheck: Date;
  healthCheckHistory: HealthCheckResult[];
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  errorRateThreshold: number; // 0-1 (e.g., 0.1 = 10%)
  responseTimeThreshold: number; // milliseconds
  uptimeThreshold: number; // 0-1 (e.g., 0.95 = 95%)
  consecutiveFailuresThreshold: number;
  enabled: boolean;
}

/**
 * Alert types
 */
export enum AlertType {
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  SLOW_RESPONSE_TIME = 'SLOW_RESPONSE_TIME',
  LOW_UPTIME = 'LOW_UPTIME',
  SERVICE_DOWN = 'SERVICE_DOWN',
  CONSECUTIVE_FAILURES = 'CONSECUTIVE_FAILURES'
}

/**
 * Alert information
 */
export interface Alert {
  id: string;
  type: AlertType;
  serviceName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Alert handler function type
 */
export type AlertHandler = (alert: Alert) => void | Promise<void>;

/**
 * Default alert configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  errorRateThreshold: 0.1, // 10%
  responseTimeThreshold: 10000, // 10 seconds
  uptimeThreshold: 0.95, // 95%
  consecutiveFailuresThreshold: 3,
  enabled: true
};

/**
 * Service monitoring and health check manager
 */
export class ServiceMonitor {
  private services: Map<string, ImageGenerationService> = new Map();
  private metrics: Map<string, ServiceMetrics> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertHandlers: AlertHandler[] = [];
  private alertConfig: AlertConfig;
  private healthCheckInterval: number = 30000; // 30 seconds
  private metricsRetentionPeriod: number = 24 * 60 * 60 * 1000; // 24 hours
  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...alertConfig };
  }

  /**
   * Register a service for monitoring
   */
  registerService(service: ImageGenerationService): void {
    const serviceName = service.getServiceName();
    this.services.set(serviceName, service);
    
    // Initialize metrics
    this.metrics.set(serviceName, {
      serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      uptime: 1.0,
      lastHealthCheck: new Date(),
      healthCheckHistory: []
    });

    console.log(`Service monitoring registered for: ${serviceName}`);
  }

  /**
   * Unregister a service from monitoring
   */
  unregisterService(serviceName: string): void {
    this.services.delete(serviceName);
    this.metrics.delete(serviceName);
    console.log(`Service monitoring unregistered for: ${serviceName}`);
  }

  /**
   * Start monitoring services
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Service monitor is already running');
      return;
    }

    this.isRunning = true;
    this.startHealthChecks();
    console.log('Service monitoring started');
  }

  /**
   * Stop monitoring services
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    console.log('Service monitoring stopped');
  }

  /**
   * Perform health check on a specific service
   */
  async performHealthCheck(serviceName: string): Promise<HealthCheckResult> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      const status = await service.getServiceStatus();
      const responseTime = Date.now() - startTime;

      result = {
        serviceName,
        isHealthy: status.available,
        responseTime,
        timestamp: new Date(),
        details: {
          lastChecked: status.lastChecked,
          errorRate: status.errorRate
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      result = {
        serviceName,
        isHealthy: false,
        responseTime,
        timestamp: new Date(),
        error: error.message || 'Health check failed'
      };
    }

    // Update metrics
    this.updateHealthCheckMetrics(serviceName, result);
    
    // Check for alerts
    if (this.alertConfig.enabled) {
      this.checkForAlerts(serviceName, result);
    }

    return result;
  }

  /**
   * Perform health checks on all registered services
   */
  async performAllHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const serviceName of this.services.keys()) {
      try {
        const result = await this.performHealthCheck(serviceName);
        results.push(result);
      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error);
      }
    }

    return results;
  }

  /**
   * Record a request result for metrics
   */
  recordRequest(serviceName: string, success: boolean, responseTime: number): void {
    const metrics = this.metrics.get(serviceName);
    if (!metrics) {
      console.warn(`Metrics not found for service: ${serviceName}`);
      return;
    }

    metrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update average response time
    const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.totalRequests;

    // Update error rate
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;

    console.log(`Recorded request for ${serviceName}: success=${success}, responseTime=${responseTime}ms`);
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceName: string): ServiceMetrics | null {
    const metrics = this.metrics.get(serviceName);
    return metrics ? { ...metrics } : null;
  }

  /**
   * Get metrics for all services
   */
  getAllMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values()).map(metrics => ({ ...metrics }));
  }

  /**
   * Get current alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Add an alert handler
   */
  addAlertHandler(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Remove an alert handler
   */
  removeAlertHandler(handler: AlertHandler): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    console.log('Alert configuration updated');
  }

  /**
   * Get service status summary
   */
  getServiceStatusSummary(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    averageResponseTime: number;
    totalRequests: number;
    overallErrorRate: number;
  } {
    const allMetrics = this.getAllMetrics();
    const totalServices = allMetrics.length;
    const healthyServices = allMetrics.filter(m => 
      m.healthCheckHistory.length > 0 && 
      m.healthCheckHistory[m.healthCheckHistory.length - 1].isHealthy
    ).length;
    
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalFailures = allMetrics.reduce((sum, m) => sum + m.failedRequests, 0);
    const totalResponseTime = allMetrics.reduce((sum, m) => sum + (m.averageResponseTime * m.totalRequests), 0);

    return {
      totalServices,
      healthyServices,
      unhealthyServices: totalServices - healthyServices,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalRequests,
      overallErrorRate: totalRequests > 0 ? totalFailures / totalRequests : 0
    };
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performAllHealthChecks();
        this.cleanupOldData();
      } catch (error) {
        console.error('Error during health checks:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Update health check metrics
   */
  private updateHealthCheckMetrics(serviceName: string, result: HealthCheckResult): void {
    const metrics = this.metrics.get(serviceName);
    if (!metrics) return;

    // Add to history
    metrics.healthCheckHistory.push(result);
    metrics.lastHealthCheck = result.timestamp;

    // Calculate uptime from recent history
    const recentChecks = metrics.healthCheckHistory.slice(-20); // Last 20 checks
    const healthyChecks = recentChecks.filter(check => check.isHealthy).length;
    metrics.uptime = healthyChecks / recentChecks.length;

    // Calculate percentile response times
    const responseTimes = recentChecks.map(check => check.responseTime).sort((a, b) => a - b);
    if (responseTimes.length > 0) {
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      metrics.p95ResponseTime = responseTimes[p95Index] || 0;
      metrics.p99ResponseTime = responseTimes[p99Index] || 0;
    }
  }

  /**
   * Check for alert conditions
   */
  private checkForAlerts(serviceName: string, result: HealthCheckResult): void {
    const metrics = this.metrics.get(serviceName);
    if (!metrics) return;

    // Check for service down
    if (!result.isHealthy) {
      this.createAlert(AlertType.SERVICE_DOWN, serviceName, 
        `Service ${serviceName} is not responding`, 'critical', {
          error: result.error,
          responseTime: result.responseTime
        });
    }

    // Check error rate
    if (metrics.errorRate > this.alertConfig.errorRateThreshold) {
      this.createAlert(AlertType.HIGH_ERROR_RATE, serviceName,
        `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`, 'high', {
          errorRate: metrics.errorRate,
          threshold: this.alertConfig.errorRateThreshold
        });
    }

    // Check response time
    if (result.responseTime > this.alertConfig.responseTimeThreshold) {
      this.createAlert(AlertType.SLOW_RESPONSE_TIME, serviceName,
        `Slow response time: ${result.responseTime}ms`, 'medium', {
          responseTime: result.responseTime,
          threshold: this.alertConfig.responseTimeThreshold
        });
    }

    // Check uptime
    if (metrics.uptime < this.alertConfig.uptimeThreshold) {
      this.createAlert(AlertType.LOW_UPTIME, serviceName,
        `Low uptime: ${(metrics.uptime * 100).toFixed(1)}%`, 'high', {
          uptime: metrics.uptime,
          threshold: this.alertConfig.uptimeThreshold
        });
    }

    // Check consecutive failures
    const recentChecks = metrics.healthCheckHistory.slice(-this.alertConfig.consecutiveFailuresThreshold);
    if (recentChecks.length >= this.alertConfig.consecutiveFailuresThreshold &&
        recentChecks.every(check => !check.isHealthy)) {
      this.createAlert(AlertType.CONSECUTIVE_FAILURES, serviceName,
        `${this.alertConfig.consecutiveFailuresThreshold} consecutive failures`, 'critical', {
          consecutiveFailures: this.alertConfig.consecutiveFailuresThreshold
        });
    }
  }

  /**
   * Create and trigger an alert
   */
  private createAlert(type: AlertType, serviceName: string, message: string, 
                     severity: Alert['severity'], metadata?: Record<string, any>): void {
    const alertId = `${type}_${serviceName}_${Date.now()}`;
    
    // Check if similar alert already exists and is not resolved
    const existingAlert = Array.from(this.alerts.values()).find(alert => 
      alert.type === type && 
      alert.serviceName === serviceName && 
      !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert timestamp
      existingAlert.timestamp = new Date();
      existingAlert.metadata = { ...existingAlert.metadata, ...metadata };
      return;
    }

    const alert: Alert = {
      id: alertId,
      type,
      serviceName,
      message,
      severity,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.set(alertId, alert);
    
    // Trigger alert handlers
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    });

    console.warn(`Alert created: ${type} for ${serviceName} - ${message}`);
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.metricsRetentionPeriod);
    
    // Clean up health check history
    for (const metrics of this.metrics.values()) {
      metrics.healthCheckHistory = metrics.healthCheckHistory.filter(
        check => check.timestamp > cutoff
      );
    }

    // Clean up old resolved alerts
    const oldAlerts = Array.from(this.alerts.entries()).filter(
      ([_, alert]) => alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff
    );
    
    oldAlerts.forEach(([alertId]) => {
      this.alerts.delete(alertId);
    });
  }
}

/**
 * Default console alert handler
 */
export const consoleAlertHandler: AlertHandler = (alert: Alert) => {
  const timestamp = alert.timestamp.toISOString();
  const level = alert.severity.toUpperCase();
  console.log(`[${timestamp}] ${level} ALERT: ${alert.message} (Service: ${alert.serviceName})`);
};

/**
 * Create a simple logging alert handler
 */
export function createLoggingAlertHandler(logFunction: (message: string) => void): AlertHandler {
  return (alert: Alert) => {
    const message = `Alert: ${alert.type} - ${alert.serviceName} - ${alert.message} (${alert.severity})`;
    logFunction(message);
  };
}