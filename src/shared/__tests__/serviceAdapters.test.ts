import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GenerationResult, ServiceStatus } from '../types';

// Mock implementations of service adapters
class MockDalleAdapter {
  private shouldFail: boolean = false;
  private responseDelay: number = 100;

  constructor(private apiKey: string) {}

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    await new Promise(resolve => setTimeout(resolve, this.responseDelay));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'DALL-E API error: Rate limit exceeded',
        retryAfter: 60000,
      };
    }

    return {
      success: true,
      imageUrl: `https://dalle-api.example.com/images/${Date.now()}.png`,
    };
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    return {
      available: !this.shouldFail,
      responseTime: this.responseDelay,
      lastChecked: new Date().toISOString(),
      errorRate: this.shouldFail ? 1.0 : 0.0,
    };
  }

  getServiceConfig() {
    return {
      name: 'DALL-E',
      apiEndpoint: 'https://api.openai.com/v1/images/generations',
      maxRetries: 3,
      timeoutMs: 30000,
      rateLimitPerMinute: 50,
    };
  }
}

class MockMidjourneyAdapter {
  private shouldFail: boolean = false;
  private responseDelay: number = 200;

  constructor(private apiKey: string) {}

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    await new Promise(resolve => setTimeout(resolve, this.responseDelay));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Midjourney API error: Service temporarily unavailable',
        retryAfter: 30000,
      };
    }

    return {
      success: true,
      imageUrl: `https://midjourney-api.example.com/images/${Date.now()}.png`,
    };
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    return {
      available: !this.shouldFail,
      responseTime: this.responseDelay,
      lastChecked: new Date().toISOString(),
      errorRate: this.shouldFail ? 1.0 : 0.0,
    };
  }

  getServiceConfig() {
    return {
      name: 'Midjourney',
      apiEndpoint: 'https://api.midjourney.com/v1/imagine',
      maxRetries: 3,
      timeoutMs: 60000,
      rateLimitPerMinute: 20,
    };
  }
}

class MockStableDiffusionAdapter {
  private shouldFail: boolean = false;
  private responseDelay: number = 150;

  constructor(private apiKey: string) {}

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    await new Promise(resolve => setTimeout(resolve, this.responseDelay));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Stable Diffusion API error: Invalid prompt format',
      };
    }

    return {
      success: true,
      imageUrl: `https://stablediffusion-api.example.com/images/${Date.now()}.png`,
    };
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    return {
      available: !this.shouldFail,
      responseTime: this.responseDelay,
      lastChecked: new Date().toISOString(),
      errorRate: this.shouldFail ? 1.0 : 0.0,
    };
  }

  getServiceConfig() {
    return {
      name: 'Stable Diffusion',
      apiEndpoint: 'https://api.stability.ai/v1/generation',
      maxRetries: 3,
      timeoutMs: 45000,
      rateLimitPerMinute: 30,
    };
  }
}

// Service Discovery and Failover Manager
class ServiceManager {
  private services: any[] = [];
  private currentServiceIndex: number = 0;

  constructor(services: any[]) {
    this.services = services;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    let lastError: string = '';
    
    for (let attempt = 0; attempt < this.services.length; attempt++) {
      const service = this.services[this.currentServiceIndex];
      
      try {
        const result = await service.generateImage(prompt);
        
        if (result.success) {
          return result;
        } else {
          lastError = result.error || 'Unknown error';
          this.rotateToNextService();
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Service error';
        this.rotateToNextService();
      }
    }

    return {
      success: false,
      error: `All services failed. Last error: ${lastError}`,
    };
  }

  async getHealthStatus(): Promise<{ serviceName: string; status: ServiceStatus }[]> {
    const statuses = await Promise.all(
      this.services.map(async (service, index) => ({
        serviceName: service.getServiceConfig().name,
        status: await service.getServiceStatus(),
      }))
    );

    return statuses;
  }

  private rotateToNextService() {
    this.currentServiceIndex = (this.currentServiceIndex + 1) % this.services.length;
  }

  getCurrentService() {
    return this.services[this.currentServiceIndex];
  }

  getServiceCount() {
    return this.services.length;
  }
}

describe('Service Adapters', () => {
  describe('MockDalleAdapter', () => {
    let adapter: MockDalleAdapter;

    beforeEach(() => {
      adapter = new MockDalleAdapter('test-api-key');
    });

    it('should generate image successfully', async () => {
      const prompt = 'A test prompt for image generation';
      const result = await adapter.generateImage(prompt);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/^https:\/\/dalle-api\.example\.com\/images\/\d+\.png$/);
      expect(result.error).toBeUndefined();
    });

    it('should handle API failures', async () => {
      adapter.setShouldFail(true);
      
      const result = await adapter.generateImage('test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('DALL-E API error');
      expect(result.retryAfter).toBe(60000);
    });

    it('should return service status', async () => {
      const status = await adapter.getServiceStatus();

      expect(status.available).toBe(true);
      expect(status.responseTime).toBe(100);
      expect(status.lastChecked).toBeDefined();
      expect(status.errorRate).toBe(0.0);
    });

    it('should return correct service configuration', () => {
      const config = adapter.getServiceConfig();

      expect(config.name).toBe('DALL-E');
      expect(config.apiEndpoint).toContain('openai.com');
      expect(config.maxRetries).toBe(3);
      expect(config.timeoutMs).toBe(30000);
      expect(config.rateLimitPerMinute).toBe(50);
    });

    it('should simulate response delay', async () => {
      adapter.setResponseDelay(500);
      
      const startTime = Date.now();
      await adapter.generateImage('test prompt');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('MockMidjourneyAdapter', () => {
    let adapter: MockMidjourneyAdapter;

    beforeEach(() => {
      adapter = new MockMidjourneyAdapter('test-api-key');
    });

    it('should generate image successfully', async () => {
      const result = await adapter.generateImage('test prompt');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/^https:\/\/midjourney-api\.example\.com\/images\/\d+\.png$/);
    });

    it('should handle service unavailable errors', async () => {
      adapter.setShouldFail(true);
      
      const result = await adapter.generateImage('test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service temporarily unavailable');
      expect(result.retryAfter).toBe(30000);
    });

    it('should have different configuration than DALL-E', () => {
      const config = adapter.getServiceConfig();

      expect(config.name).toBe('Midjourney');
      expect(config.rateLimitPerMinute).toBe(20); // Lower than DALL-E
      expect(config.timeoutMs).toBe(60000); // Higher than DALL-E
    });
  });

  describe('MockStableDiffusionAdapter', () => {
    let adapter: MockStableDiffusionAdapter;

    beforeEach(() => {
      adapter = new MockStableDiffusionAdapter('test-api-key');
    });

    it('should generate image successfully', async () => {
      const result = await adapter.generateImage('test prompt');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/^https:\/\/stablediffusion-api\.example\.com\/images\/\d+\.png$/);
    });

    it('should handle prompt format errors', async () => {
      adapter.setShouldFail(true);
      
      const result = await adapter.generateImage('invalid prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid prompt format');
      expect(result.retryAfter).toBeUndefined(); // No retry after for this error type
    });

    it('should have unique service configuration', () => {
      const config = adapter.getServiceConfig();

      expect(config.name).toBe('Stable Diffusion');
      expect(config.apiEndpoint).toContain('stability.ai');
      expect(config.rateLimitPerMinute).toBe(30);
      expect(config.timeoutMs).toBe(45000);
    });
  });

  describe('ServiceManager (Failover)', () => {
    let serviceManager: ServiceManager;
    let dalleAdapter: MockDalleAdapter;
    let midjourneyAdapter: MockMidjourneyAdapter;
    let stableDiffusionAdapter: MockStableDiffusionAdapter;

    beforeEach(() => {
      dalleAdapter = new MockDalleAdapter('dalle-key');
      midjourneyAdapter = new MockMidjourneyAdapter('midjourney-key');
      stableDiffusionAdapter = new MockStableDiffusionAdapter('sd-key');
      
      serviceManager = new ServiceManager([
        dalleAdapter,
        midjourneyAdapter,
        stableDiffusionAdapter,
      ]);
    });

    it('should use first available service', async () => {
      const result = await serviceManager.generateImage('test prompt');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('dalle-api.example.com');
    });

    it('should failover to next service when first fails', async () => {
      dalleAdapter.setShouldFail(true);
      
      const result = await serviceManager.generateImage('test prompt');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('midjourney-api.example.com');
    });

    it('should try all services before giving up', async () => {
      dalleAdapter.setShouldFail(true);
      midjourneyAdapter.setShouldFail(true);
      stableDiffusionAdapter.setShouldFail(true);
      
      const result = await serviceManager.generateImage('test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('All services failed');
    });

    it('should rotate service selection after failure', async () => {
      dalleAdapter.setShouldFail(true);
      
      // First call should failover to Midjourney
      const result1 = await serviceManager.generateImage('test prompt 1');
      expect(result1.imageUrl).toContain('midjourney-api.example.com');
      
      // Reset DALL-E but now Midjourney is the current service
      dalleAdapter.setShouldFail(false);
      
      // Second call should use Midjourney (current service)
      const result2 = await serviceManager.generateImage('test prompt 2');
      expect(result2.imageUrl).toContain('midjourney-api.example.com');
    });

    it('should return health status for all services', async () => {
      dalleAdapter.setShouldFail(true);
      midjourneyAdapter.setResponseDelay(300);
      
      const healthStatus = await serviceManager.getHealthStatus();

      expect(healthStatus).toHaveLength(3);
      expect(healthStatus[0].serviceName).toBe('DALL-E');
      expect(healthStatus[0].status.available).toBe(false);
      expect(healthStatus[1].serviceName).toBe('Midjourney');
      expect(healthStatus[1].status.available).toBe(true);
      expect(healthStatus[1].status.responseTime).toBe(300);
      expect(healthStatus[2].serviceName).toBe('Stable Diffusion');
      expect(healthStatus[2].status.available).toBe(true);
    });

    it('should track current service correctly', () => {
      const currentService = serviceManager.getCurrentService();
      expect(currentService.getServiceConfig().name).toBe('DALL-E');
      
      expect(serviceManager.getServiceCount()).toBe(3);
    });
  });

  describe('Service Integration Scenarios', () => {
    let serviceManager: ServiceManager;
    let services: any[];

    beforeEach(() => {
      services = [
        new MockDalleAdapter('dalle-key'),
        new MockMidjourneyAdapter('midjourney-key'),
        new MockStableDiffusionAdapter('sd-key'),
      ];
      serviceManager = new ServiceManager(services);
    });

    it('should handle mixed service availability', async () => {
      // Make DALL-E and Stable Diffusion fail, only Midjourney works
      services[0].setShouldFail(true);
      services[2].setShouldFail(true);
      
      const result = await serviceManager.generateImage('test prompt');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('midjourney-api.example.com');
    });

    it('should handle different response times', async () => {
      services[0].setResponseDelay(1000); // DALL-E slow
      services[1].setResponseDelay(100);  // Midjourney fast
      services[2].setResponseDelay(500);  // Stable Diffusion medium
      
      const startTime = Date.now();
      const result = await serviceManager.generateImage('test prompt');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // Should use DALL-E (first service) despite being slower
      expect(result.imageUrl).toContain('dalle-api.example.com');
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle service recovery', async () => {
      // Initially fail DALL-E
      services[0].setShouldFail(true);
      
      // First call should use Midjourney
      const result1 = await serviceManager.generateImage('test prompt 1');
      expect(result1.imageUrl).toContain('midjourney-api.example.com');
      
      // Recover DALL-E
      services[0].setShouldFail(false);
      
      // Service manager should still be on Midjourney, but DALL-E is available
      const result2 = await serviceManager.generateImage('test prompt 2');
      expect(result2.success).toBe(true);
    });

    it('should provide comprehensive error information', async () => {
      // Make all services fail with different errors
      services[0].setShouldFail(true); // DALL-E: Rate limit
      services[1].setShouldFail(true); // Midjourney: Service unavailable
      services[2].setShouldFail(true); // Stable Diffusion: Invalid prompt
      
      const result = await serviceManager.generateImage('test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('All services failed');
      expect(result.error).toContain('Invalid prompt format'); // Last error from Stable Diffusion
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    let serviceManager: ServiceManager;

    beforeEach(() => {
      const services = [
        new MockDalleAdapter('dalle-key'),
        new MockMidjourneyAdapter('midjourney-key'),
        new MockStableDiffusionAdapter('sd-key'),
      ];
      serviceManager = new ServiceManager(services);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        serviceManager.generateImage(`concurrent prompt ${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle high-frequency requests', async () => {
      const requestCount = 10; // Reduced for faster test
      const results: GenerationResult[] = [];

      for (let i = 0; i < requestCount; i++) {
        const result = await serviceManager.generateImage(`high-frequency prompt ${i}`);
        results.push(result);
      }

      expect(results).toHaveLength(requestCount);
      expect(results.every(result => result.success)).toBe(true);
    }, 10000); // 10 second timeout

    it('should maintain performance under mixed load', async () => {
      // Simulate different response times
      const services = serviceManager['services'];
      services[0].setResponseDelay(100);  // Fast
      services[1].setResponseDelay(500);  // Medium
      services[2].setResponseDelay(1000); // Slow

      const startTime = Date.now();
      const results = await Promise.all([
        serviceManager.generateImage('prompt 1'),
        serviceManager.generateImage('prompt 2'),
        serviceManager.generateImage('prompt 3'),
      ]);
      const endTime = Date.now();

      expect(results.every(result => result.success)).toBe(true);
      // All should complete in roughly the time of the slowest (first) service
      expect(endTime - startTime).toBeLessThan(1500); // Some buffer for concurrency
    });
  });
});