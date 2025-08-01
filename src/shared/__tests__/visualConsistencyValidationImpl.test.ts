import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PromptTemplateEngineImpl } from '../promptTemplateEngineImpl';
import { ImageGenerationManager } from '../imageGenerationManager';
import { MockAdapter } from '../adapters/mockAdapter';
import { ImageGenerationParams } from '../types';

/**
 * Visual Consistency Validation Implementation
 * 
 * This test suite implements task 10.1: Conduct visual consistency validation
 * - Generate test images using various parameter combinations
 * - Validate brand consistency and character proportions
 * - Test frame sequence continuity and narrative flow
 * - Verify technical specifications are properly applied
 */
describe('Visual Consistency Validation Implementation', () => {
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

  describe('Parameter Combination Testing', () => {
    /**
     * Test various parameter combinations to ensure all work correctly
     * Requirements: 8.1, 8.2, 8.3, 8.4
     */
    const testCombinations: ImageGenerationParams[] = [
      // Basic pose combinations
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
      // Onboarding combinations with props
      {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map'
      },
      // Different outfit combinations
      {
        pose: 'arms-crossed',
        outfit: 'tshirt-shorts',
        footwear: 'adidas-ultraboost'
      },
      {
        pose: 'pointing-forward',
        outfit: 'windbreaker-shorts',
        footwear: 'air-jordan-11-bred'
      },
      // Prop variations
      {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'glowing-hourglass'
      },
      {
        pose: 'sitting-on-rock',
        outfit: 'hoodie-sweatpants',
        footwear: 'nike-air-max-90',
        prop: 'stone-totem'
      }
    ];

    it.each(testCombinations)('should generate valid prompts for combination: %o', (params) => {
      // Validate parameters first
      const validation = promptEngine.validateParameters(params);
      
      if (!validation.isValid) {
        console.log('Validation errors:', validation.errors);
        console.log('Available options:', promptEngine.getAvailableOptions());
      }
      
      expect(validation.isValid).toBe(true);
      
      // Generate prompt
      const prompt = promptEngine.buildPrompt(params);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
      
      // Validate prompt structure
      expect(prompt).toContain('CAPITÃO CAVERNA');
      expect(prompt).toContain('NEGATIVE PROMPT:');
    });

    it('should maintain consistent character foundation across all combinations', () => {
      const characterElements = [
        'Confident gray and cream wolf',
        'intense red eyes',
        'anthropomorphic form',
        'Athletic humanoid build',
        'five fingers per hand'
      ];

      testCombinations.forEach(params => {
        const validation = promptEngine.validateParameters(params);
        if (validation.isValid) {
          const prompt = promptEngine.buildPrompt(params);
          
          characterElements.forEach(element => {
            expect(prompt).toContain(element);
          });
        }
      });
    });

    it('should include technical specifications in all prompts', () => {
      const technicalElements = [
        'Ultra-high-resolution',
        'physically-based render',
        '4K resolution minimum',
        'photorealistic'
      ];

      testCombinations.forEach(params => {
        const validation = promptEngine.validateParameters(params);
        if (validation.isValid) {
          const prompt = promptEngine.buildPrompt(params);
          
          technicalElements.forEach(element => {
            expect(prompt).toContain(element);
          });
        }
      });
    });
  });

  describe('Brand Consistency Validation', () => {
    /**
     * Validate brand consistency across different parameter combinations
     * Requirements: 8.1, 8.2
     */
    it('should maintain consistent brand elements', () => {
      const brandElements = [
        'CAPITÃO CAVERNA',
        'gray #808080',
        'cream #F5F5DC',
        'red eyes #DC143C',
        'brand identity'
      ];

      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      brandElements.forEach(element => {
        expect(prompt).toContain(element);
      });
    });

    it('should maintain character proportions specifications', () => {
      const proportionElements = [
        'Anatomically correct proportions',
        'exactly five fingers per hand',
        'proper limb positioning',
        'realistic joint articulation'
      ];

      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      proportionElements.forEach(element => {
        expect(prompt).toContain(element);
      });
    });

    it('should include comprehensive negative prompts for quality control', () => {
      const negativeElements = [
        'deformed hands',
        'extra fingers',
        'missing fingers',
        'unrealistic anatomy',
        'character inconsistency',
        'poor quality'
      ];

      const params: ImageGenerationParams = {
        pose: 'sitting-on-rock',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-11-bred'
      };

      const prompt = promptEngine.buildPrompt(params);
      const negativeSection = prompt.split('NEGATIVE PROMPT:')[1];
      
      expect(negativeSection).toBeTruthy();
      negativeElements.forEach(element => {
        expect(negativeSection).toContain(element);
      });
    });
  });

  describe('Frame Sequence Continuity Testing', () => {
    /**
     * Test frame sequence continuity and narrative flow
     * Requirements: 9.1, 9.2, 9.3, 9.4
     */
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
    });

    it('should include frame-specific positioning and lighting specifications', () => {
      const framePrompt = promptEngine.buildFramePrompt('01A', {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      });

      // Frame-specific elements
      expect(framePrompt).toContain('EXACT LOCATION:');
      expect(framePrompt).toContain('CHARACTER POSITIONING:');
      expect(framePrompt).toContain('LIGHTING ON CHARACTER:');
      expect(framePrompt).toContain('CAMERA:');
    });

    it('should support narrative voiceover integration', () => {
      const frameDefinition = promptEngine.getFrameDefinition('01A');
      expect(frameDefinition).toBeTruthy();
      expect(frameDefinition?.voiceover).toContain('Welcome to the depths of knowledge');
      
      const frame02Definition = promptEngine.getFrameDefinition('02B');
      expect(frame02Definition?.voiceover).toContain('These passages hold centuries');
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
      expect(validation.errors.some(error => error.includes('requires prop'))).toBe(true);
    });
  });

  describe('Technical Specifications Validation', () => {
    /**
     * Verify technical specifications are properly applied
     * Requirements: 8.3, 8.4
     */
    it('should apply correct technical specifications for standard generation', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      expect(prompt).toContain('Ultra-high-resolution');
      expect(prompt).toContain('physically-based render');
      expect(prompt).toContain('4K resolution minimum');
      expect(prompt).toContain('photorealistic quality');
    });

    it('should apply enhanced technical specifications for onboarding frames', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '02B'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      expect(prompt).toContain('Cinematic quality rendering');
      expect(prompt).toContain('dramatic lighting');
      expect(prompt).toContain('narrative composition');
    });

    it('should include environment specifications consistently', () => {
      const environmentElements = [
        'cathedral-scale granite',
        'limestone architecture',
        'Massive stone pillars',
        'Warm amber crystal formations',
        'Stalactites and stalagmites'
      ];

      const params: ImageGenerationParams = {
        pose: 'sitting-on-rock',
        outfit: 'windbreaker-shorts',
        footwear: 'adidas-ultraboost'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      environmentElements.forEach(element => {
        expect(prompt).toContain(element);
      });
    });
  });

  describe('End-to-End Generation Workflow Validation', () => {
    /**
     * Test complete generation workflow
     * Requirements: All requirements validation
     */
    it('should complete full generation workflow with valid parameters', async () => {
      const params: ImageGenerationParams = {
        pose: 'pointing-forward',
        outfit: 'tshirt-shorts',
        footwear: 'nike-air-max-90'
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
      expect(result.serviceName).toBe('mock');
    });

    it('should handle invalid parameter combinations gracefully', () => {
      const invalidParams: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const validation = promptEngine.validateParameters(invalidParams);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.suggestions).toBeDefined();
    });

    it('should provide helpful error messages for debugging', () => {
      const params: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      const validation = promptEngine.validateParameters(params);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('not found'))).toBe(true);
      expect(validation.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Quality Metrics', () => {
    /**
     * Validate performance and quality metrics
     */
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

    it('should maintain consistent prompt quality across different combinations', () => {
      const testCombinations = [
        { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' },
        { pose: 'pointing-forward', outfit: 'tshirt-shorts', footwear: 'nike-air-max-90' },
        { pose: 'sitting-on-rock', outfit: 'windbreaker-shorts', footwear: 'adidas-ultraboost' }
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

    it('should validate prompt structure and completeness', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map'
      };

      const prompt = promptEngine.buildPrompt(params);
      
      // Prompt should be substantial but not excessive
      expect(prompt.length).toBeGreaterThan(500);
      expect(prompt.length).toBeLessThan(5000);
      
      // Should have proper structure
      expect(prompt).toContain('NEGATIVE PROMPT:');
      expect(prompt.split('\n\n').length).toBeGreaterThan(5); // Multiple sections
      
      // Should contain all required elements
      expect(prompt).toContain('CHARACTER FOUNDATION');
      expect(prompt).toContain('ENVIRONMENT FOUNDATION');
      expect(prompt).toContain('BRAND ACCURACY');
      expect(prompt).toContain('TEXTURE / RESOLUTION BOOST');
    });
  });

  describe('Regression and Edge Case Testing', () => {
    /**
     * Test edge cases and regression scenarios
     */
    it('should handle minimal parameter sets', () => {
      const minimalParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago'
      };

      expect(() => promptEngine.buildPrompt(minimalParams)).not.toThrow();
      const prompt = promptEngine.buildPrompt(minimalParams);
      expect(prompt).toBeTruthy();
    });

    it('should handle maximal parameter sets', () => {
      const maximalParams: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '02B'
      };

      expect(() => promptEngine.buildPrompt(maximalParams)).not.toThrow();
      const prompt = promptEngine.buildPrompt(maximalParams);
      expect(prompt).toBeTruthy();
      expect(prompt).toContain('EXACT LOCATION:');
      expect(prompt).toContain('CHARACTER POSITIONING:');
    });

    it('should maintain backward compatibility with known working combinations', () => {
      const knownWorkingCombinations = [
        { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' },
        { pose: 'pointing-forward', outfit: 'tshirt-shorts', footwear: 'nike-air-max-90' },
        { pose: 'sitting-on-rock', outfit: 'windbreaker-shorts', footwear: 'adidas-ultraboost' }
      ];

      knownWorkingCombinations.forEach(params => {
        const validation = promptEngine.validateParameters(params);
        expect(validation.isValid).toBe(true);
        
        const prompt = promptEngine.buildPrompt(params);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('Visual Consistency Report Generation', () => {
    /**
     * Generate a comprehensive report of visual consistency validation results
     */
    it('should generate visual consistency validation report', () => {
      const report = {
        timestamp: new Date().toISOString(),
        testResults: {
          parameterCombinations: 0,
          brandConsistency: 0,
          frameSequences: 0,
          technicalSpecs: 0,
          endToEndWorkflow: 0,
          performance: 0,
          regressionTests: 0
        },
        issues: [] as string[],
        recommendations: [] as string[]
      };

      // Test parameter combinations
      const testCombinations = [
        { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' },
        { pose: 'pointing-forward', outfit: 'tshirt-shorts', footwear: 'nike-air-max-90' },
        { pose: 'sitting-on-rock', outfit: 'windbreaker-shorts', footwear: 'adidas-ultraboost' },
        { pose: 'holding-cave-map', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago', prop: 'cave-map' }
      ];

      testCombinations.forEach(params => {
        try {
          const validation = promptEngine.validateParameters(params);
          if (validation.isValid) {
            const prompt = promptEngine.buildPrompt(params);
            if (prompt && prompt.length > 100) {
              report.testResults.parameterCombinations++;
            }
          } else {
            report.issues.push(`Invalid parameter combination: ${JSON.stringify(params)}`);
          }
        } catch (error) {
          report.issues.push(`Error testing combination ${JSON.stringify(params)}: ${error}`);
        }
      });

      // Test brand consistency
      try {
        const brandTestParams = { pose: 'arms-crossed', outfit: 'hoodie-sweatpants', footwear: 'air-jordan-1-chicago' };
        const prompt = promptEngine.buildPrompt(brandTestParams);
        if (prompt.includes('CAPITÃO CAVERNA') && prompt.includes('gray #808080')) {
          report.testResults.brandConsistency++;
        }
      } catch (error) {
        report.issues.push(`Brand consistency test failed: ${error}`);
      }

      // Test frame sequences
      try {
        const frame01A = promptEngine.buildFramePrompt('01A', {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'air-jordan-1-chicago'
        });
        if (frame01A.includes('EXACT LOCATION:')) {
          report.testResults.frameSequences++;
        }
      } catch (error) {
        report.issues.push(`Frame sequence test failed: ${error}`);
      }

      // Generate recommendations
      if (report.testResults.parameterCombinations < testCombinations.length) {
        report.recommendations.push('Review parameter compatibility validation logic');
      }
      if (report.issues.length > 0) {
        report.recommendations.push('Address validation issues before production deployment');
      }

      // Validate report completeness
      expect(report.testResults.parameterCombinations).toBeGreaterThan(0);
      expect(report.timestamp).toBeTruthy();
      
      console.log('Visual Consistency Validation Report:', JSON.stringify(report, null, 2));
    });
  });
});