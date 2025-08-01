import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ImageGenerationParams, GenerationResult, ServiceStatus } from '../types';

// Mock the image generation manager
class MockImageGenerationManager {
  private services: Map<string, any> = new Map();
  private currentService: string = 'dalle';
  private shouldFail: boolean = false;

  constructor() {
    // Initialize with mock services
    this.services.set('dalle', {
      name: 'DALL-E',
      generateImage: vi.fn(),
      getServiceStatus: vi.fn(),
    });
    this.services.set('midjourney', {
      name: 'Midjourney',
      generateImage: vi.fn(),
      getServiceStatus: vi.fn(),
    });
    this.services.set('stable-diffusion', {
      name: 'Stable Diffusion',
      generateImage: vi.fn(),
      getServiceStatus: vi.fn(),
    });
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async generateImage(params: ImageGenerationParams): Promise<GenerationResult & { serviceUsed: string }> {
    const service = this.services.get(this.currentService);
    
    if (this.shouldFail) {
      return {
        success: false,
        error: `${service.name} generation failed`,
        serviceUsed: this.currentService,
      };
    }

    const mockImageUrl = `https://${this.currentService}-api.example.com/images/${Date.now()}.png`;
    
    return {
      success: true,
      imageUrl: mockImageUrl,
      serviceUsed: this.currentService,
    };
  }

  async getServiceHealth(): Promise<Record<string, ServiceStatus>> {
    const health: Record<string, ServiceStatus> = {};
    
    for (const [serviceName, service] of this.services) {
      health[serviceName] = {
        available: !this.shouldFail,
        responseTime: Math.random() * 1000,
        lastChecked: new Date().toISOString(),
        errorRate: this.shouldFail ? 1.0 : 0.0,
      };
    }
    
    return health;
  }

  setCurrentService(serviceName: string) {
    if (this.services.has(serviceName)) {
      this.currentService = serviceName;
    }
  }

  getCurrentService(): string {
    return this.currentService;
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }
}

// Mock prompt template engine
class MockPromptTemplateEngine {
  buildPrompt(params: ImageGenerationParams): string {
    return `Generated prompt for pose: ${params.pose}, outfit: ${params.outfit}, footwear: ${params.footwear}`;
  }

  validateParameters(params: ImageGenerationParams) {
    const errors: string[] = [];
    
    if (!params.pose) errors.push('Pose is required');
    if (!params.outfit) errors.push('Outfit is required');
    if (!params.footwear) errors.push('Footwear is required');
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

// Integration manager that combines all components
class ImageGenerationIntegrationManager {
  private generationManager: MockImageGenerationManager;
  private promptEngine: MockPromptTemplateEngine;
  private generationHistory: Array<{
    params: ImageGenerationParams;
    result: GenerationResult & { serviceUsed: string };
    prompt: string;
    timestamp: string;
  }> = [];

  constructor() {
    this.generationManager = new MockImageGenerationManager();
    this.promptEngine = new MockPromptTemplateEngine();
  }

  async generateImage(params: ImageGenerationParams): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
    serviceUsed?: string;
    prompt?: string;
    validationErrors?: string[];
  }> {
    // Validate parameters
    const validation = this.promptEngine.validateParameters(params);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Parameter validation failed',
        validationErrors: validation.errors,
      };
    }

    // Build prompt
    const prompt = this.promptEngine.buildPrompt(params);

    // Generate image
    const result = await this.generationManager.generateImage(params);

    // Record in history
    this.generationHistory.push({
      params,
      result,
      prompt,
      timestamp: new Date().toISOString(),
    });

    return {
      success: result.success,
      imageUrl: result.imageUrl,
      error: result.error,
      serviceUsed: result.serviceUsed,
      prompt,
    };
  }

  async getServiceHealth() {
    return this.generationManager.getServiceHealth();
  }

  getGenerationHistory() {
    return this.generationHistory;
  }

  getGenerationStats() {
    const total = this.generationHistory.length;
    const successful = this.generationHistory.filter(h => h.result.success).length;
    const failed = total - successful;
    
    const serviceUsage = this.generationHistory.reduce((acc, h) => {
      if (h.result.success) {
        acc[h.result.serviceUsed] = (acc[h.result.serviceUsed] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      serviceUsage,
    };
  }

  setServiceFailure(shouldFail: boolean) {
    this.generationManager.setShouldFail(shouldFail);
  }

  setCurrentService(serviceName: string) {
    this.generationManager.setCurrentService(serviceName);
  }
}

describe('ImageGenerationManager', () => {
  let manager: MockImageGenerationManager;

  beforeEach(() => {
    manager = new MockImageGenerationManager();
  });

  describe('generateImage', () => {
    it('should generate image successfully with valid parameters', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await manager.generateImage(params);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toMatch(/^https:\/\/dalle-api\.example\.com\/images\/\d+\.png$/);
      expect(result.serviceUsed).toBe('dalle');
    });

    it('should handle generation failures', async () => {
      manager.setShouldFail(true);
      
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await manager.generateImage(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('generation failed');
      expect(result.serviceUsed).toBe('dalle');
    });

    it('should use different services when switched', async () => {
      manager.setCurrentService('midjourney');
      
      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      const result = await manager.generateImage(params);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('midjourney-api.example.com');
      expect(result.serviceUsed).toBe('midjourney');
    });
  });

  describe('service management', () => {
    it('should return available services', () => {
      const services = manager.getAvailableServices();

      expect(services).toContain('dalle');
      expect(services).toContain('midjourney');
      expect(services).toContain('stable-diffusion');
      expect(services).toHaveLength(3);
    });

    it('should track current service', () => {
      expect(manager.getCurrentService()).toBe('dalle');
      
      manager.setCurrentService('stable-diffusion');
      expect(manager.getCurrentService()).toBe('stable-diffusion');
    });

    it('should not switch to invalid service', () => {
      const originalService = manager.getCurrentService();
      manager.setCurrentService('invalid-service');
      
      expect(manager.getCurrentService()).toBe(originalService);
    });
  });

  describe('service health monitoring', () => {
    it('should return health status for all services', async () => {
      const health = await manager.getServiceHealth();

      expect(health).toHaveProperty('dalle');
      expect(health).toHaveProperty('midjourney');
      expect(health).toHaveProperty('stable-diffusion');
      
      Object.values(health).forEach(status => {
        expect(status).toHaveProperty('available');
        expect(status).toHaveProperty('responseTime');
        expect(status).toHaveProperty('lastChecked');
        expect(status).toHaveProperty('errorRate');
      });
    });

    it('should reflect service failures in health status', async () => {
      manager.setShouldFail(true);
      
      const health = await manager.getServiceHealth();

      Object.values(health).forEach(status => {
        expect(status.available).toBe(false);
        expect(status.errorRate).toBe(1.0);
      });
    });
  });
});

describe('ImageGenerationIntegrationManager', () => {
  let integrationManager: ImageGenerationIntegrationManager;

  beforeEach(() => {
    integrationManager = new ImageGenerationIntegrationManager();
  });

  describe('end-to-end image generation', () => {
    it('should complete full generation workflow', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await integrationManager.generateImage(params);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.serviceUsed).toBeDefined();
      expect(result.prompt).toContain('arms-crossed');
      expect(result.prompt).toContain('hoodie-sweatpants');
      expect(result.prompt).toContain('air-jordan-1-chicago');
    });

    it('should handle parameter validation failures', async () => {
      const invalidParams: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await integrationManager.generateImage(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parameter validation failed');
      expect(result.validationErrors).toContain('Pose is required');
    });

    it('should handle service generation failures', async () => {
      integrationManager.setServiceFailure(true);
      
      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      const result = await integrationManager.generateImage(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('generation failed');
      expect(result.serviceUsed).toBeDefined();
    });

    it('should record generation history', async () => {
      const params1: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const params2: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      await integrationManager.generateImage(params1);
      await integrationManager.generateImage(params2);

      const history = integrationManager.getGenerationHistory();

      expect(history).toHaveLength(2);
      expect(history[0].params).toEqual(params1);
      expect(history[1].params).toEqual(params2);
      expect(history[0].timestamp).toBeDefined();
      expect(history[1].timestamp).toBeDefined();
    });
  });

  describe('statistics and monitoring', () => {
    it('should calculate generation statistics', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      // Generate some successful images
      await integrationManager.generateImage(params);
      await integrationManager.generateImage(params);

      // Generate a failed image
      integrationManager.setServiceFailure(true);
      await integrationManager.generateImage(params);

      const stats = integrationManager.getGenerationStats();

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.serviceUsage.dalle).toBe(2);
    });

    it('should track service usage distribution', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      // Generate with DALL-E
      await integrationManager.generateImage(params);
      await integrationManager.generateImage(params);

      // Switch to Midjourney and generate
      integrationManager.setCurrentService('midjourney');
      await integrationManager.generateImage(params);

      const stats = integrationManager.getGenerationStats();

      expect(stats.serviceUsage.dalle).toBe(2);
      expect(stats.serviceUsage.midjourney).toBe(1);
    });

    it('should handle empty statistics gracefully', () => {
      const stats = integrationManager.getGenerationStats();

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.serviceUsage).toEqual({});
    });
  });

  describe('service health integration', () => {
    it('should provide comprehensive service health', async () => {
      const health = await integrationManager.getServiceHealth();

      expect(Object.keys(health)).toHaveLength(3);
      expect(health.dalle).toBeDefined();
      expect(health.midjourney).toBeDefined();
      expect(health['stable-diffusion']).toBeDefined();
    });

    it('should reflect service failures in health monitoring', async () => {
      integrationManager.setServiceFailure(true);
      
      const health = await integrationManager.getServiceHealth();

      Object.values(health).forEach(status => {
        expect(status.available).toBe(false);
        expect(status.errorRate).toBe(1.0);
      });
    });
  });

  describe('complex parameter combinations', () => {
    it('should handle frame-specific parameters', async () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '01A',
      };

      const result = await integrationManager.generateImage(params);

      expect(result.success).toBe(true);
      expect(result.prompt).toContain('holding-cave-map');
      expect(result.prompt).toContain('cave-map');
    });

    it('should handle sequence parameters', async () => {
      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'windbreaker-shorts',
        footwear: 'nike-air-max-90',
        frameType: 'sequence',
        frameId: '02B',
      };

      const result = await integrationManager.generateImage(params);

      expect(result.success).toBe(true);
      expect(result.prompt).toContain('pointing-forward');
      expect(result.prompt).toContain('windbreaker-shorts');
    });

    it('should validate complex parameter combinations', async () => {
      const invalidParams: ImageGenerationParams = {
        pose: '',
        outfit: '',
        footwear: '',
        frameType: 'onboarding',
        frameId: '01A',
      };

      const result = await integrationManager.generateImage(invalidParams);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Pose is required');
      expect(result.validationErrors).toContain('Outfit is required');
      expect(result.validationErrors).toContain('Footwear is required');
    });
  });

  describe('concurrent generation handling', () => {
    it('should handle multiple concurrent generations', async () => {
      const params1: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const params2: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      const params3: ImageGenerationParams = {
        pose: 'sitting-on-rock',
        outfit: 'windbreaker-shorts',
        footwear: 'adidas-ultraboost',
      };

      const promises = [
        integrationManager.generateImage(params1),
        integrationManager.generateImage(params2),
        integrationManager.generateImage(params3),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      const history = integrationManager.getGenerationHistory();
      expect(history).toHaveLength(3);
    });

    it('should handle mixed success/failure in concurrent generations', async () => {
      const validParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const invalidParams: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const promises = [
        integrationManager.generateImage(validParams),
        integrationManager.generateImage(invalidParams),
        integrationManager.generateImage(validParams),
      ];

      const results = await Promise.all(promises);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      const stats = integrationManager.getGenerationStats();
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
    });
  });
});