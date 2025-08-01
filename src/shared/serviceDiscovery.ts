import { 
  ImageGenerationService, 
  ServiceDiscovery, 
  ServiceStats,
  GenerationErrorType,
  createGenerationError
} from './imageGenerationService';

/**
 * Service registry entry
 */
interface ServiceEntry {
  service: ImageGenerationService;
  priority: number;
  stats: ServiceStats;
  isEnabled: boolean;
}

/**
 * Implementation of service discovery with failover logic
 */
export class ServiceDiscoveryImpl implements ServiceDiscovery {
  private services: Map<string, ServiceEntry> = new Map();
  private healthCheckInterval: number = 60000; // 1 minute
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.startHealthChecks();
  }

  /**
   * Register a new service with priority
   */
  registerService(service: ImageGenerationService, priority: number): void {
    const serviceName = service.getServiceName();
    
    const stats: ServiceStats = {
      serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastSuccessfulRequest: null,
      lastFailedRequest: null,
      isHealthy: true,
      consecutiveFailures: 0
    };

    this.services.set(serviceName, {
      service,
      priority,
      stats,
      isEnabled: true
    });

    console.log(`Registered service: ${serviceName} with priority ${priority}`);
  }

  /**
   * Remove a service from the registry
   */
  unregisterService(serviceName: string): void {
    if (this.services.delete(serviceName)) {
      console.log(`Unregistered service: ${serviceName}`);
    }
  }

  /**
   * Get the primary available service (highest priority + healthy)
   */
  async getPrimaryService(): Promise<ImageGenerationService | null> {
    const availableServices = await this.getAvailableServices();
    return availableServices.length > 0 ? availableServices[0] : null;
  }

  /**
   * Get all available services sorted by priority
   */
  async getAvailableServices(): Promise<ImageGenerationService[]> {
    const healthyServices: Array<{ service: ImageGenerationService; priority: number }> = [];

    for (const [serviceName, entry] of this.services.entries()) {
      if (!entry.isEnabled) continue;

      try {
        const isAvailable = await entry.service.isAvailable();
        if (isAvailable) {
          healthyServices.push({
            service: entry.service,
            priority: entry.priority
          });
          
          // Update health status
          this.updateServiceHealth(serviceName, true);
        } else {
          this.updateServiceHealth(serviceName, false);
        }
      } catch (error) {
        console.error(`Health check failed for service ${serviceName}:`, error);
        this.updateServiceHealth(serviceName, false);
      }
    }

    // Sort by priority (lower number = higher priority)
    healthyServices.sort((a, b) => a.priority - b.priority);
    
    return healthyServices.map(entry => entry.service);
  }

  /**
   * Update service health status
   */
  updateServiceHealth(serviceName: string, isHealthy: boolean): void {
    const entry = this.services.get(serviceName);
    if (!entry) return;

    entry.stats.isHealthy = isHealthy;
    
    if (isHealthy) {
      entry.stats.consecutiveFailures = 0;
      entry.stats.lastSuccessfulRequest = new Date();
    } else {
      entry.stats.consecutiveFailures++;
      entry.stats.lastFailedRequest = new Date();
      
      // Disable service after too many consecutive failures
      if (entry.stats.consecutiveFailures >= 5) {
        entry.isEnabled = false;
        console.warn(`Service ${serviceName} disabled due to consecutive failures`);
      }
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(serviceName: string): ServiceStats | null {
    const entry = this.services.get(serviceName);
    return entry ? { ...entry.stats } : null;
  }

  /**
   * Record a successful request for statistics
   */
  recordSuccess(serviceName: string, responseTime: number): void {
    const entry = this.services.get(serviceName);
    if (!entry) return;

    entry.stats.totalRequests++;
    entry.stats.successfulRequests++;
    entry.stats.lastSuccessfulRequest = new Date();
    
    // Update average response time
    const totalTime = entry.stats.averageResponseTime * (entry.stats.totalRequests - 1) + responseTime;
    entry.stats.averageResponseTime = totalTime / entry.stats.totalRequests;
    
    this.updateServiceHealth(serviceName, true);
  }

  /**
   * Record a failed request for statistics
   */
  recordFailure(serviceName: string, _error: any): void {
    const entry = this.services.get(serviceName);
    if (!entry) return;

    entry.stats.totalRequests++;
    entry.stats.failedRequests++;
    entry.stats.lastFailedRequest = new Date();
    
    this.updateServiceHealth(serviceName, false);
  }

  /**
   * Get all registered services (for admin/monitoring)
   */
  getAllServices(): Array<{ name: string; priority: number; stats: ServiceStats; enabled: boolean }> {
    return Array.from(this.services.entries()).map(([name, entry]) => ({
      name,
      priority: entry.priority,
      stats: { ...entry.stats },
      enabled: entry.isEnabled
    }));
  }

  /**
   * Enable/disable a service
   */
  setServiceEnabled(serviceName: string, enabled: boolean): void {
    const entry = this.services.get(serviceName);
    if (entry) {
      entry.isEnabled = enabled;
      console.log(`Service ${serviceName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [serviceName, entry] of this.services.entries()) {
        if (!entry.isEnabled) continue;

        try {
          const status = await entry.service.getServiceStatus();
          this.updateServiceHealth(serviceName, status.available);
        } catch (error) {
          console.error(`Health check failed for ${serviceName}:`, error);
          this.updateServiceHealth(serviceName, false);
        }
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop health checks (cleanup)
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Generate an image using the best available service with automatic failover
   */
  async generateImageWithFailover(prompt: string): Promise<{
    result: any;
    serviceName: string;
  }> {
    const availableServices = await this.getAvailableServices();
    
    if (availableServices.length === 0) {
      throw createGenerationError(
        GenerationErrorType.SERVICE_UNAVAILABLE,
        'No image generation services are currently available',
        false
      );
    }

    let lastError: any;

    for (const service of availableServices) {
      const serviceName = service.getServiceName();
      const startTime = Date.now();

      try {
        console.log(`Attempting image generation with service: ${serviceName}`);
        const result = await service.generateImage(prompt);
        
        const responseTime = Date.now() - startTime;
        this.recordSuccess(serviceName, responseTime);
        
        return { result, serviceName };
      } catch (error) {
        Date.now() - startTime; // Calculate response time for potential logging
        console.error(`Service ${serviceName} failed:`, error);
        
        this.recordFailure(serviceName, error);
        lastError = error;
        
        // If this is a non-retryable error, don't try other services
        if (error && (error as any).retryable === false) {
          break;
        }
      }
    }

    // All services failed
    throw lastError || createGenerationError(
      GenerationErrorType.SERVICE_UNAVAILABLE,
      'All image generation services failed',
      false
    );
  }
}

// Global service discovery instance
export const serviceDiscovery = new ServiceDiscoveryImpl();