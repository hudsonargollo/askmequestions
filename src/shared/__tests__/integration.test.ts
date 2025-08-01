import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageGenerationParams, GeneratedImageRecord } from '../types';

// Mock environment for integration tests
interface MockEnvironment {
  IMAGE_BUCKET: any;
  DATABASE: any;
  OPENAI_API_KEY: string;
  MIDJOURNEY_API_KEY: string;
  STABLE_DIFFUSION_API_KEY: string;
}

// Mock R2 Bucket
const createMockR2Bucket = () => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({
    body: new Blob(['mock image data']),
    key: 'test-key',
    size: 1024,
  }),
  head: vi.fn().mockResolvedValue({
    key: 'test-key',
    size: 1024,
    uploaded: new Date(),
  }),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({
    objects: [],
    truncated: false,
  }),
});

// Mock D1 Database
const createMockD1Database = () => {
  const mockStmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ success: true, changes: 1 }),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };

  return {
    prepare: vi.fn().mockReturnValue(mockStmt),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
    _mockStmt: mockStmt, // For test access
  };
};

// Mock external API responses
const mockExternalAPIs = () => {
  // Mock fetch for external AI services
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('openai.com')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            url: 'https://dalle-api.example.com/images/test-image.png'
          }]
        }),
      });
    }
    
    if (url.includes('midjourney.com')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          image_url: 'https://midjourney-api.example.com/images/test-image.png'
        }),
      });
    }
    
    if (url.includes('stability.ai')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          artifacts: [{
            base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          }]
        }),
      });
    }

    // Mock image fetch
    if (url.includes('example.com/images/')) {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
      });
    }

    return Promise.reject(new Error(`Unmocked URL: ${url}`));
  });
};

// Integration test class that simulates the complete workflow
class ImageGenerationWorkflow {
  private env: MockEnvironment;
  private generationHistory: Array<{
    params: ImageGenerationParams;
    imageId: string;
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
    publicUrl?: string;
    error?: string;
    startTime: number;
    endTime?: number;
  }> = [];

  constructor(env: MockEnvironment) {
    this.env = env;
  }

  async generateImage(params: ImageGenerationParams, userId: string): Promise<{
    success: boolean;
    imageId?: string;
    publicUrl?: string;
    error?: string;
    generationTimeMs?: number;
  }> {
    const startTime = Date.now();
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Validate parameters
      const validation = this.validateParameters(params);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Step 2: Build prompt
      const prompt = this.buildPrompt(params);

      // Step 3: Insert pending record in database
      const record: GeneratedImageRecord = {
        image_id: imageId,
        user_id: userId,
        r2_object_key: '',
        prompt_parameters: JSON.stringify(params),
        created_at: new Date().toISOString(),
        status: 'PENDING',
        error_message: null,
        generation_time_ms: null,
        service_used: null,
        public_url: null,
      };

      await this.insertDatabaseRecord(record);

      // Track in history
      this.generationHistory.push({
        params,
        imageId,
        status: 'PENDING',
        startTime,
      });

      // Step 4: Call external AI service
      const generationResult = await this.callExternalService(prompt, params);
      if (!generationResult.success) {
        await this.updateDatabaseStatus(imageId, 'FAILED', generationResult.error);
        this.updateHistoryStatus(imageId, 'FAILED', generationResult.error);
        return {
          success: false,
          imageId,
          error: generationResult.error,
        };
      }

      // Step 5: Fetch image data
      const imageData = await this.fetchImageData(generationResult.imageUrl!);

      // Step 6: Store in R2
      const objectKey = `images/${Date.now()}/${imageId}.png`;
      await this.storeInR2(objectKey, imageData, params);

      // Step 7: Generate public URL
      const publicUrl = this.generatePublicUrl(objectKey);

      // Step 8: Update database with completion
      const endTime = Date.now();
      const generationTimeMs = endTime - startTime;
      
      await this.updateDatabaseCompletion(imageId, {
        status: 'COMPLETE',
        r2_object_key: objectKey,
        public_url: publicUrl,
        generation_time_ms: generationTimeMs,
        service_used: this.getServiceFromParams(params),
      });

      // Update history
      this.updateHistoryStatus(imageId, 'COMPLETE', undefined, publicUrl, endTime);

      return {
        success: true,
        imageId,
        publicUrl,
        generationTimeMs,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateDatabaseStatus(imageId, 'FAILED', errorMessage);
      this.updateHistoryStatus(imageId, 'FAILED', errorMessage);
      
      return {
        success: false,
        imageId,
        error: errorMessage,
      };
    }
  }

  private validateParameters(params: ImageGenerationParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!params.pose) errors.push('Pose is required');
    if (!params.outfit) errors.push('Outfit is required');
    if (!params.footwear) errors.push('Footwear is required');
    
    if (params.frameType === 'onboarding' && !params.frameId) {
      errors.push('Frame ID is required for onboarding frame type');
    }
    
    if (params.frameType === 'sequence' && !params.frameId) {
      errors.push('Frame ID is required for sequence frame type');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private buildPrompt(params: ImageGenerationParams): string {
    return `Generated prompt for pose: ${params.pose}, outfit: ${params.outfit}, footwear: ${params.footwear}${params.prop ? `, prop: ${params.prop}` : ''}${params.frameId ? `, frame: ${params.frameId}` : ''}`;
  }

  private async insertDatabaseRecord(record: GeneratedImageRecord): Promise<void> {
    const stmt = this.env.DATABASE._mockStmt;
    stmt.run.mockResolvedValueOnce({ success: true, changes: 1 });
    // Simulate database insertion
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async callExternalService(prompt: string, params: ImageGenerationParams): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      // Simulate service selection based on parameters
      let serviceUrl = 'https://api.openai.com/v1/images/generations';
      
      if (params.frameType === 'onboarding') {
        serviceUrl = 'https://api.midjourney.com/v1/imagine';
      } else if (params.frameType === 'sequence') {
        serviceUrl = 'https://api.stability.ai/v1/generation';
      }

      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Service responded with ${response.status}`);
      }

      const data = await response.json();
      
      // Extract image URL based on service
      let imageUrl: string;
      if (serviceUrl.includes('openai.com')) {
        imageUrl = data.data[0].url;
      } else if (serviceUrl.includes('midjourney.com')) {
        imageUrl = data.image_url;
      } else {
        // Stable Diffusion returns base64, convert to URL
        imageUrl = 'https://stablediffusion-api.example.com/images/test-image.png';
      }

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'External service error',
      };
    }
  }

  private async fetchImageData(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    return await response.blob();
  }

  private async storeInR2(objectKey: string, imageData: Blob, params: ImageGenerationParams): Promise<void> {
    await this.env.IMAGE_BUCKET.put(objectKey, imageData, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
      },
      customMetadata: {
        'generation-params': JSON.stringify(params),
        'pose': params.pose,
        'outfit': params.outfit,
        'footwear': params.footwear,
      },
    });
  }

  private generatePublicUrl(objectKey: string): string {
    return `https://capitao-caverna-images.r2.cloudflarestorage.com/${objectKey}`;
  }

  private async updateDatabaseStatus(imageId: string, status: 'FAILED', errorMessage: string): Promise<void> {
    const stmt = this.env.DATABASE._mockStmt;
    stmt.run.mockResolvedValueOnce({ success: true, changes: 1 });
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  private async updateDatabaseCompletion(imageId: string, updates: {
    status: 'COMPLETE';
    r2_object_key: string;
    public_url: string;
    generation_time_ms: number;
    service_used: string;
  }): Promise<void> {
    const stmt = this.env.DATABASE._mockStmt;
    stmt.run.mockResolvedValueOnce({ success: true, changes: 1 });
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  private getServiceFromParams(params: ImageGenerationParams): string {
    if (params.frameType === 'onboarding') return 'midjourney';
    if (params.frameType === 'sequence') return 'stable-diffusion';
    return 'dalle';
  }

  private updateHistoryStatus(
    imageId: string, 
    status: 'COMPLETE' | 'FAILED', 
    error?: string, 
    publicUrl?: string, 
    endTime?: number
  ): void {
    const historyItem = this.generationHistory.find(h => h.imageId === imageId);
    if (historyItem) {
      historyItem.status = status;
      if (error) historyItem.error = error;
      if (publicUrl) historyItem.publicUrl = publicUrl;
      if (endTime) historyItem.endTime = endTime;
    }
  }

  getGenerationHistory() {
    return this.generationHistory;
  }

  getGenerationStats() {
    const total = this.generationHistory.length;
    const completed = this.generationHistory.filter(h => h.status === 'COMPLETE').length;
    const failed = this.generationHistory.filter(h => h.status === 'FAILED').length;
    const pending = this.generationHistory.filter(h => h.status === 'PENDING').length;

    const completedItems = this.generationHistory.filter(h => h.status === 'COMPLETE' && h.endTime);
    const avgGenerationTime = completedItems.length > 0 
      ? completedItems.reduce((sum, item) => sum + (item.endTime! - item.startTime), 0) / completedItems.length
      : 0;

    return {
      total,
      completed,
      failed,
      pending,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgGenerationTime,
    };
  }
}

describe('End-to-End Integration Tests', () => {
  let mockEnv: MockEnvironment;
  let workflow: ImageGenerationWorkflow;

  beforeEach(() => {
    mockEnv = {
      IMAGE_BUCKET: createMockR2Bucket(),
      DATABASE: createMockD1Database(),
      OPENAI_API_KEY: 'test-openai-key',
      MIDJOURNEY_API_KEY: 'test-midjourney-key',
      STABLE_DIFFUSION_API_KEY: 'test-sd-key',
    };

    workflow = new ImageGenerationWorkflow(mockEnv);
    mockExternalAPIs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Image Generation Workflow', () => {
    it('should complete full workflow from API to storage', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(true);
      expect(result.imageId).toBeDefined();
      expect(result.publicUrl).toMatch(/^https:\/\/capitao-caverna-images\.r2\.cloudflarestorage\.com\//);
      expect(result.generationTimeMs).toBeGreaterThan(0);

      // Verify R2 storage was called
      expect(mockEnv.IMAGE_BUCKET.put).toHaveBeenCalledWith(
        expect.stringMatching(/^images\/\d+\/img_\d+_[a-z0-9]+\.png$/),
        expect.any(Blob),
        expect.objectContaining({
          httpMetadata: expect.objectContaining({
            contentType: 'image/png',
          }),
          customMetadata: expect.objectContaining({
            'pose': 'arms-crossed',
            'outfit': 'hoodie-sweatpants',
            'footwear': 'air-jordan-1-chicago',
          }),
        })
      );

      // Verify database operations
      expect(mockEnv.DATABASE.prepare).toHaveBeenCalled();
      expect(mockEnv.DATABASE._mockStmt.run).toHaveBeenCalledTimes(2); // Insert + Update
    });

    it('should handle parameter validation failures', async () => {
      const invalidParams: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await workflow.generateImage(invalidParams, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.error).toContain('Pose is required');

      // Should not call external services or storage
      expect(mockEnv.IMAGE_BUCKET.put).not.toHaveBeenCalled();
    });

    it('should handle external service failures', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
      expect(result.imageId).toBeDefined();

      // Should not store in R2
      expect(mockEnv.IMAGE_BUCKET.put).not.toHaveBeenCalled();

      // Should update database with failure
      expect(mockEnv.DATABASE._mockStmt.run).toHaveBeenCalledTimes(2); // Insert + Update failure
    });

    it('should handle R2 storage failures', async () => {
      // Mock R2 to fail
      mockEnv.IMAGE_BUCKET.put.mockRejectedValue(new Error('R2 storage failed'));

      const params: ImageGenerationParams = {
        pose: 'sitting-on-rock',
        outfit: 'windbreaker-shorts',
        footwear: 'adidas-ultraboost',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('R2 storage failed');

      // Should have attempted to store
      expect(mockEnv.IMAGE_BUCKET.put).toHaveBeenCalled();
    });

    it('should handle database failures gracefully', async () => {
      // Mock database to fail on insert
      mockEnv.DATABASE._mockStmt.run.mockRejectedValue(new Error('Database connection lost'));

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection lost');
    });
  });

  describe('Frame Sequence Generation', () => {
    it('should generate onboarding frame sequence', async () => {
      const frameParams: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '01A',
      };

      const result = await workflow.generateImage(frameParams, 'user-123');

      expect(result.success).toBe(true);
      expect(result.publicUrl).toBeDefined();

      // Should use Midjourney for onboarding frames
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.midjourney.com/v1/imagine',
        expect.any(Object)
      );
    });

    it('should generate sequence frames with continuity', async () => {
      const sequenceFrames: ImageGenerationParams[] = [
        {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
          frameType: 'sequence',
          frameId: '01A',
        },
        {
          pose: 'pointing-forward',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
          frameType: 'sequence',
          frameId: '02B',
        },
        {
          pose: 'holding-cave-map',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago',
          prop: 'cave-map',
          frameType: 'sequence',
          frameId: '03C',
        },
      ];

      const results = await Promise.all(
        sequenceFrames.map(params => workflow.generateImage(params, 'user-123'))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(3);

      // All should use Stable Diffusion for sequence frames
      expect(global.fetch).toHaveBeenCalledTimes(6); // 3 service calls + 3 image fetches
      
      const serviceCalls = (global.fetch as any).mock.calls.filter((call: any) => 
        call[0].includes('stability.ai')
      );
      expect(serviceCalls).toHaveLength(3);
    });

    it('should validate frame requirements', async () => {
      const invalidFrameParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameType: 'onboarding', // Missing frameId
      };

      const result = await workflow.generateImage(invalidFrameParams, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Frame ID is required for onboarding frame type');
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should handle service timeout scenarios', async () => {
      // Mock fetch to timeout
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle image fetch failures', async () => {
      // Mock service success but image fetch failure
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{ url: 'https://dalle-api.example.com/images/test-image.png' }]
          }),
        })
        .mockRejectedValueOnce(new Error('Image fetch failed'));

      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image fetch failed');
    });

    it('should track error statistics', async () => {
      // Generate some successful and failed images
      const successParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const failParams: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      await workflow.generateImage(successParams, 'user-123');
      await workflow.generateImage(successParams, 'user-123');
      await workflow.generateImage(failParams, 'user-123');

      const stats = workflow.getGenerationStats();

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.avgGenerationTime).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Request Handling', () => {
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
        workflow.generateImage(params1, 'user-123'),
        workflow.generateImage(params2, 'user-456'),
        workflow.generateImage(params3, 'user-789'),
      ];

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.map(r => r.imageId)).toHaveLength(3);
      expect(new Set(results.map(r => r.imageId)).size).toBe(3); // All unique

      // Verify all were stored
      expect(mockEnv.IMAGE_BUCKET.put).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success/failure in concurrent requests', async () => {
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
        workflow.generateImage(validParams, 'user-123'),
        workflow.generateImage(invalidParams, 'user-456'),
        workflow.generateImage(validParams, 'user-789'),
      ];

      const results = await Promise.all(promises);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      const stats = workflow.getGenerationStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
    });

    it('should maintain data consistency under concurrent load', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      // Generate 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        workflow.generateImage(params, `user-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      
      // All should have unique image IDs
      const imageIds = results.map(r => r.imageId);
      expect(new Set(imageIds).size).toBe(10);

      // All should have been stored
      expect(mockEnv.IMAGE_BUCKET.put).toHaveBeenCalledTimes(10);

      // Database should have been called for each (insert + update)
      expect(mockEnv.DATABASE._mockStmt.run).toHaveBeenCalledTimes(20);
    });
  });

  describe('Rate Limiting and Resource Management', () => {
    it('should handle service rate limiting', async () => {
      // Mock rate limiting response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = await workflow.generateImage(params, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service responded with 429');
    });

    it('should track resource usage patterns', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      // Generate multiple images to track patterns
      await workflow.generateImage(params, 'user-123');
      await workflow.generateImage({ ...params, frameType: 'onboarding', frameId: '01A' }, 'user-123');
      await workflow.generateImage({ ...params, frameType: 'sequence', frameId: '02B' }, 'user-123');

      const history = workflow.getGenerationHistory();

      expect(history).toHaveLength(3);
      expect(history[0].params.frameType).toBeUndefined();
      expect(history[1].params.frameType).toBe('onboarding');
      expect(history[2].params.frameType).toBe('sequence');

      // Verify different services were used
      const serviceCalls = (global.fetch as any).mock.calls.filter((call: any) => 
        call[0].includes('api.')
      );
      expect(serviceCalls.some((call: any) => call[0].includes('openai.com'))).toBe(true);
      expect(serviceCalls.some((call: any) => call[0].includes('midjourney.com'))).toBe(true);
      expect(serviceCalls.some((call: any) => call[0].includes('stability.ai'))).toBe(true);
    });
  });
});