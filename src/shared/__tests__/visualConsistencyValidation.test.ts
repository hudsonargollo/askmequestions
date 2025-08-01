import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PromptTemplateEngineImpl } from '../promptTemplateEngineImpl';
import { ImageGenerationManager } from '../imageGenerationManager';
import { MockAdapter } from '../adapters/mockAdapter';
import { ImageGenerationParams, GenerationResult } from '../types';

/**
 * Visual Consistency Validation Test Suite
 * 
 * This test suite validates:
 * - Brand consistency across different parameter combinations
 * - Character proportions and technical specifications
 * - Frame sequence continuity and narrative flow
 * - Prompt template accuracy and completeness
 */
describe('Visual Consistency Validation', () => {
  let promptEngine: PromptTemplateEngineImpl;
  let imageManager: ImageGenerationManager;
  let mockAdapter: MockAdapter;

  beforeAll(async () => {
    // Initialize components
    promptEngine = new PromptTemplateEngineImpl();
    imageManager = new ImageGenerationManager();
    mockAdapter = new MockAdapter();

    // Register mock adapter for testing
    imageManager.registerService(mockAdapter, 1);
    await imageManager.initialize();
  });

  afterAll(async () => {
    await imageManager.shutdown();
  });

  describe('Brand Consistency Validation', () => {
    const testCombinations: ImageGenerationParams[] = [
      {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      },
      {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90'
      },
      {
        pose: 'sitting-on-rock',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-11-bred'
      },
      {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map'
      }
    ];

    it.each(testCombinations)('should maintain brand consistency for combination: %o', async (params) => {
      const prompt = promptEngine.buildPrompt(params);
      
      // Validate brand elements are present
      expect(prompt).toContain('Confident gray and cream wolf');
      expect(prompt).toContain('intense red eyes');
      expect(prompt).toContain('CAPITÃO CAVERNA');
      
      // Validate technical specifications
      expect(prompt).toContain('Ultra-high-resolution');
      expect(prompt).toContain('physically-based render');
      
      // Validate environment consistency
      expect(prompt).toContain('cathedral-scale granite');
      expect(prompt).toContain('limestone architecture');
      
      // Validate negative prompt inclusion
      expect(prompt).toContain('NEGATIVE PROMPT:');
      expect(prompt).toContain('inconsistent character proportions');
      expect(prompt).toContain('incorrect finger count');
    });

    it('should generate consistent prompts for the same parameters', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt1 = promptEngine.buildPrompt(params);
      const prompt2 = promptEngine.buildPrompt(params);
      
      expect(prompt1).toBe(prompt2);
    });

    it('should validate character foundation elements in all prompts', () => {
      const availableOptions = promptEngine.getAvailableOptions();
      
      // Test with different poses
      availableOptions.poses.forEach(pose => {
        const params: ImageGenerationParams = {
          pose: pose.id,
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        };

        const validation = promptEngine.validateParameters(params);
        if (validation.isValid) {
          const prompt = promptEngine.buildPrompt(params);
          
          // Character foundation must be present
          expect(prompt).toContain('Confident gray and cream wolf');
          expect(prompt).toContain('intense red eyes');
          expect(prompt).toContain('anthropomorphic form');
        }
      });
    });
  });

  describe('Character Proportions and Technical Specifications', () => {
    it('should include body proportion reinforcement in all prompts', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      // Body proportion specifications
      expect(prompt).toContain('Anatomically correct proportions');
      expect(prompt).toContain('proper limb positioning');
      
      // Hand and finger specifications
      expect(prompt).toContain('five fingers per hand');
      expect(prompt).toContain('natural hand positioning');
      
      // Technical rendering requirements
      expect(prompt).toContain('4K resolution minimum');
      expect(prompt).toContain('advanced lighting');
    });

    it('should apply pose-specific anatomical requirements', () => {
      const poseTests = [
        {
          pose: 'arms-crossed',
          expectedElements: ['arms crossed over chest', 'shoulders back', 'perfect posture']
        },
        {
          pose: 'pointing-forward',
          expectedElements: ['right hand extended', 'Pointing forward', 'dynamic leadership pose']
        },
        {
          pose: 'sitting-on-rock',
          expectedElements: ['sitting comfortably', 'relaxed but alert posture', 'hands resting naturally']
        }
      ];

      poseTests.forEach(({ pose, expectedElements }) => {
        const params: ImageGenerationParams = {
          pose,
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        };

        const prompt = promptEngine.buildPrompt(params);
        
        expectedElements.forEach(element => {
          expect(prompt).toContain(element);
        });
      });
    });

    it('should include comprehensive negative prompts for quality control', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);
      const negativeSection = prompt.split('NEGATIVE PROMPT:')[1];
      
      expect(negativeSection).toContain('incorrect finger count');
      expect(negativeSection).toContain('unrealistic anatomy');
      expect(negativeSection).toContain('character inconsistency');
      expect(negativeSection).toContain('poor quality');
      expect(negativeSection).toContain('blurry');
    });
  });

  describe('Frame Sequence Continuity and Narrative Flow', () => {
    it('should maintain continuity between sequential frames', () => {
      const frame01A = promptEngine.buildFramePrompt('01A', {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      });

      const frame02B = promptEngine.buildFramePrompt('02B', {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map'
      });

      // Both frames should maintain character consistency
      expect(frame01A).toContain('Confident gray and cream wolf');
      expect(frame02B).toContain('Confident gray and cream wolf');
      
      // Both should have consistent environment
      expect(frame01A).toContain('cathedral-scale granite');
      expect(frame02B).toContain('cathedral-scale granite');
      
      // Frame-specific elements should be present
      expect(frame01A).toContain('Central cave chamber');
      expect(frame02B).toContain('Near cave wall with ancient markings');
      
      // Continuity notes should be applied
      expect(frame02B).toContain('Maintain consistent lighting direction');
    });

    it('should include frame-specific positioning and lighting', () => {
      const frameDefinition = promptEngine.getFrameDefinition('01A');
      expect(frameDefinition).toBeTruthy();
      
      if (frameDefinition) {
        const framePrompt = promptEngine.buildFramePrompt('01A', {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        });

        // Frame-specific elements
        expect(framePrompt).toContain('EXACT LOCATION: Central cave chamber');
        expect(framePrompt).toContain('CHARACTER POSITIONING: Center frame');
        expect(framePrompt).toContain('LIGHTING ON CHARACTER: Dramatic overhead crystal lighting');
        expect(framePrompt).toContain('CAMERA: Medium shot, eye level');
      }
    });

    it('should validate required props for specific frames', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameId: '02B'
        // Missing required prop 'cave-map'
      };

      const validation = promptEngine.validateParameters(params);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Frame "Map Presentation" requires prop "Cave Map"');
    });

    it('should support narrative voiceover integration', () => {
      const frameDefinition = promptEngine.getFrameDefinition('01A');
      expect(frameDefinition?.voiceover).toContain('Welcome to the depths of knowledge');
      
      const frame02Definition = promptEngine.getFrameDefinition('02B');
      expect(frame02Definition?.voiceover).toContain('These passages hold centuries');
    });
  });

  describe('Parameter Compatibility Validation', () => {
    it('should validate pose-outfit compatibility', () => {
      const validParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const validation = promptEngine.validateParameters(validParams);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect incompatible parameter combinations', () => {
      // Create an incompatible combination by modifying the engine
      const originalPose = promptEngine.getAvailableOptions().poses.find(p => p.id === 'arms-crossed');
      if (originalPose) {
        // Temporarily modify compatibility for testing
        const modifiedPose = { ...originalPose, compatibleOutfits: ['non-existent-outfit'] };
        promptEngine.addPose(modifiedPose);

        const invalidParams: ImageGenerationParams = {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        };

        const validation = promptEngine.validateParameters(invalidParams);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('not compatible'))).toBe(true);
      }
    });

    it('should provide helpful suggestions for invalid combinations', () => {
      const invalidParams: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const validation = promptEngine.validateParameters(invalidParams);
      expect(validation.isValid).toBe(false);
      expect(validation.suggestions).toBeDefined();
      expect(validation.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Generation Validation', () => {
    it('should complete full generation workflow with valid parameters', async () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      // Validate parameters
      const validation = promptEngine.validateParameters(params);
      expect(validation.isValid).toBe(true);

      // Build prompt
      const prompt = promptEngine.buildPrompt(params);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);

      // Generate image (using mock adapter)
      const result = await imageManager.generateImage(prompt);
      expect(result.result.success).toBe(true);
      expect(result.serviceName).toBe('mock-adapter');
      expect(result.attempts).toBeGreaterThan(0);
    });

    it('should handle generation failures gracefully', async () => {
      // Configure mock adapter to fail
      mockAdapter.setShouldFail(true);

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);

      try {
        await imageManager.generateImage(prompt);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.error).toBeTruthy();
        expect(error.totalTime).toBeGreaterThan(0);
      }

      // Reset mock adapter
      mockAdapter.setShouldFail(false);
    });
  });

  describe('Performance and Quality Metrics', () => {
    it('should generate prompts within acceptable time limits', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const startTime = Date.now();
      const prompt = promptEngine.buildPrompt(params);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(prompt).toBeTruthy();
    });

    it('should validate prompt length and structure', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      // Prompt should be substantial but not excessive
      expect(prompt.length).toBeGreaterThan(500);
      expect(prompt.length).toBeLessThan(5000);
      
      // Should have proper structure
      expect(prompt).toContain('NEGATIVE PROMPT:');
      expect(prompt.split('\n\n').length).toBeGreaterThan(5); // Multiple sections
    });

    it('should maintain consistent prompt quality across different combinations', () => {
      const testCombinations = [
        { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' },
        { pose: 'pointing-forward', outfit: 'tshirt-shorts', footwear: 'nike-air-max-90' },
        { pose: 'sitting-on-rock', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-11-bred' }
      ];

      const prompts = testCombinations.map(params => promptEngine.buildPrompt(params));
      
      // All prompts should have similar structure and quality
      prompts.forEach(prompt => {
        expect(prompt).toContain('CHARACTER FOUNDATION');
        expect(prompt).toContain('NEGATIVE PROMPT:');
        expect(prompt.split('\n\n').length).toBeGreaterThan(5);
      });

      // Prompts should be different but of similar length
      const lengths = prompts.map(p => p.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      lengths.forEach(length => {
        expect(Math.abs(length - avgLength) / avgLength).toBeLessThan(0.3); // Within 30% of average
      });
    });
  });

  describe('Regression Testing', () => {
    it('should maintain backward compatibility with existing parameter combinations', () => {
      // Test known working combinations from previous versions
      const knownWorkingCombinations = [
        { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' },
        { pose: 'pointing-forward', outfit: 'tshirt-shorts', footwear: 'nike-air-max-90' },
        { pose: 'holding-cave-map', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago', prop: 'cave-map' }
      ];

      knownWorkingCombinations.forEach(params => {
        const validation = promptEngine.validateParameters(params);
        expect(validation.isValid).toBe(true);
        
        const prompt = promptEngine.buildPrompt(params);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(100);
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test with minimal parameters
      const minimalParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      expect(() => promptEngine.buildPrompt(minimalParams)).not.toThrow();

      // Test with maximum parameters
      const maximalParams: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '02B'
      };

      expect(() => promptEngine.buildPrompt(maximalParams)).not.toThrow();
    });
  });
});