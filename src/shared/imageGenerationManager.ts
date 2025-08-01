import { ImageGenerationService } from './imageGenerationService';
import { ServiceDiscoveryImpl } from './serviceDiscovery';
import { RetryManager, CircuitBreaker } from './retryLogic';
import { ServiceMonitor, consoleAlertHandler } from './serviceMonitoring';
import { GenerationResult } from './types';

/**
 * Configuration for the image generation manager
 */
export interface ImageGenerationManagerConfig {
  retryConfig?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    timeoutMs?: number;
  };
  circuitBreakerConfig?: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    successThreshold?: number;
  };
  monitoringConfig?: {
    healthCheckInterval?: number;
    alertConfig?: {
      errorRateThreshold?: number;
      responseTimeThreshold?: number;
      uptimeThreshold?: number;
      consecutiveFailuresThreshold?: number;
      enabled?: boolean;
    };
  };
}

/**
 * Comprehensive image generation manager that integrates all components
 */
export class ImageGenerationManager {
  private serviceDiscovery: ServiceDiscoveryImpl;
  private retryManager: RetryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private serviceMonitor: ServiceMonitor;
  private isInitialized: boolean = false;

  constructor(config: ImageGenerationManagerConfig = {}) {
    // Initialize service discovery
    this.serviceDiscovery = new ServiceDiscoveryImpl();

    // Initialize retry manager
    this.retryManager = new RetryManager(config.retryConfig);

    // Initialize service monitor
    this.serviceMonitor = new ServiceMonitor(config.monitoringConfig?.alertConfig);
    this.serviceMonitor.addAlertHandler(consoleAlertHandler);
  }

  /**
   * Initialize the manager and start monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('ImageGenerationManager is already initialized');
      return;
    }

    // Start service monitoring
    this.serviceMonitor.start();
    
    this.isInitialized = true;
    console.log('ImageGenerationManager initialized successfully');
  }

  /**
   * Shutdown the manager and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Stop service monitoring
    this.serviceMonitor.stop();
    
    // Cleanup service discovery
    this.serviceDiscovery.destroy();
    
    this.isInitialized = false;
    console.log('ImageGenerationManager shutdown completed');
  }

  /**
   * Register an image generation service
   */
  registerService(service: ImageGenerationService, priority: number = 1): void {
    const serviceName = service.getServiceName();
    
    // Register with service discovery
    this.serviceDiscovery.registerService(service, priority);
    
    // Create circuit breaker for this service
    const circuitBreaker = new CircuitBreaker(serviceName);
    this.circuitBreakers.set(serviceName, circuitBreaker);
    
    // Register with monitoring
    this.serviceMonitor.registerService(service);
    
    console.log(`Registered service: ${serviceName} with priority ${priority}`);
  }

  /**
   * Unregister an image generation service
   */
  unregisterService(serviceName: string): void {
    // Unregister from service discovery
    this.serviceDiscovery.unregisterService(serviceName);
    
    // Remove circuit breaker
    this.circuitBreakers.delete(serviceName);
    
    // Unregister from monitoring
    this.serviceMonitor.unregisterService(serviceName);
    
    console.log(`Unregistered service: ${serviceName}`);
  }

  /**
   * Generate an image with full error handling, retry logic, and monitoring
   */
  async generateImage(prompt: string): Promise<{
    result: GenerationResult;
    serviceName: string;
    attempts: number;
    totalTime: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('ImageGenerationManager not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    
    try {
      // Use retry manager with service discovery and circuit breakers
      const retryResult = await this.retryManager.executeWithRetry(
        async () => {
          // Get the best available service with failover
          const { result, serviceName } = await this.serviceDiscovery.generateImageWithFailover(prompt);
          
          // Execute through circuit breaker
          const circuitBreaker = this.circuitBreakers.get(serviceName);
          if (circuitBreaker) {
            return await circuitBreaker.execute(async () => {
              // Record the request for monitoring
              const requestStart = Date.now();
              try {
                const generationResult = await this.executeGeneration(serviceName, prompt);
                const responseTime = Date.now() - requestStart;
                this.serviceMonitor.recordRequest(serviceName, true, responseTime);
                return { result: generationResult, serviceName };
              } catch (error) {
                const responseTime = Date.now() - requestStart;
                this.serviceMonitor.recordRequest(serviceName, false, responseTime);
                throw error;
              }
            });
          } else {
            // Fallback without circuit breaker
            return { result, serviceName };
          }
        },
        'image-generation'
      );

      const totalTime = Date.now() - startTime;

      if (retryResult.success && retryResult.result) {
        return {
          result: retryResult.result.result,
          serviceName: retryResult.result.serviceName,
          attempts: retryResult.attempts.length,
          totalTime
        };
      } else {
        throw retryResult.error || new Error('Image generation failed');
      }

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error('Image generation failed after all retries:', error);
      
      throw {
        error: error.message || 'Image generation failed',
        totalTime,
        attempts: 0
      };
    }
  }

  /**
   * Execute image generation with a specific service
   */
  private async executeGeneration(serviceName: string, prompt: string): Promise<GenerationResult> {
    // This would be implemented to call the actual service
    // For now, we'll use the service discovery to get the service and call it
    const availableServices = await this.serviceDiscovery.getAvailableServices();
    const service = availableServices.find(s => s.getServiceName() === serviceName);
    
    if (!service) {
      throw new Error(`Service not available: ${serviceName}`);
    }
    
    return await service.generateImage(prompt);
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<{
    summary: any;
    services: any[];
    alerts: any[];
  }> {
    const summary = this.serviceMonitor.getServiceStatusSummary();
    const services = this.serviceMonitor.getAllMetrics();
    const alerts = this.serviceMonitor.getActiveAlerts();

    return {
      summary,
      services,
      alerts
    };
  }

  /**
   * Get detailed service metrics
   */
  getServiceMetrics(serviceName?: string): any {
    if (serviceName) {
      return this.serviceMonitor.getServiceMetrics(serviceName);
    }
    return this.serviceMonitor.getAllMetrics();
  }

  /**
   * Perform health check on all services
   */
  async performHealthCheck(): Promise<any[]> {
    return await this.serviceMonitor.performAllHealthChecks();
  }

  /**
   * Get circuit breaker status for all services
   */
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers.entries()) {
      status[serviceName] = circuitBreaker.getStatus();
    }
    
    return status;
  }

  /**
   * Reset circuit breaker for a specific service
   */
  resetCircuitBreaker(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a service
   */
  setServiceEnabled(serviceName: string, enabled: boolean): void {
    this.serviceDiscovery.setServiceEnabled(serviceName, enabled);
  }

  /**
   * Get all registered services with their status
   */
  getRegisteredServices(): any[] {
    return this.serviceDiscovery.getAllServices();
  }

  /**
   * Add a custom alert handler
   */
  addAlertHandler(handler: (alert: any) => void): void {
    this.serviceMonitor.addAlertHandler(handler);
  }

  /**
   * Update monitoring configuration
   */
  updateMonitoringConfig(config: any): void {
    this.serviceMonitor.updateAlertConfig(config);
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: any): void {
    this.retryManager.updateConfig(config);
  }
}

/**
 * Global instance for easy access
 */
export const imageGenerationManager = new ImageGenerationManager();