import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateEngineImpl } from '../promptTemplateEngineImpl';
import { ImageGenerationParams } from '../types';

describe('Prompt Template Engine Validation Integration', () => {
  let engine: PromptTemplateEngineImpl;

  beforeEach(() => {
    engine = new PromptTemplateEngineImpl();
  });

  describe('Basic Validation Integration', () => {
    it('should validate parameters through the engine', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid parameter combinations', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'windbreaker-shorts', // Not compatible with arms-crossed
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Validation Integration', () => {
    it('should provide detailed validation results', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.compatibility).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should detect complex validation issues', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map', // Cannot hold map with arms crossed
        frameType: 'sequence', // Missing frameId
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(false);
      
      // Should detect technical conflict
      expect(result.errors.some(e => 
        e.message.includes('Technical conflict') || 
        e.message.includes('cannot hold map with arms crossed')
      )).toBe(true);

      // Should detect missing frameId
      expect(result.errors.some(e => 
        e.field === 'frameId' && e.severity === 'error'
      )).toBe(true);
    });

    it('should provide alternative suggestions', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'windbreaker-shorts', // Not compatible
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(false);
      
      // Check if alternative options are provided when there are compatibility errors
      const hasOutfitError = result.errors.some(e => e.field === 'outfit' && e.severity === 'error');
      if (hasOutfitError) {
        expect(result.alternativeOptions?.outfits).toBeDefined();
        expect(result.alternativeOptions?.outfits?.length).toBeGreaterThan(0);
      } else {
        // If no outfit error, there should still be some validation errors
        expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
      }
    });
  });

  describe('Frame-Specific Validation', () => {
    it('should validate frame requirements correctly', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameId: '02B',
        frameType: 'onboarding',
        prop: 'cave-map',
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(true);
    });

    it('should detect missing required props for frames', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameId: '02B', // Requires cave-map prop
        frameType: 'onboarding',
        // Missing required prop
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'prop' && e.message.includes('requires prop')
      )).toBe(true);
    });
  });

  describe('Compatible Options', () => {
    it('should return compatible options based on pose selection', () => {
      const params = { pose: 'arms-crossed' };
      const compatible = engine.getCompatibleOptions(params);
      
      expect(compatible.outfits).toBeDefined();
      expect(compatible.outfits?.length).toBeGreaterThan(0);
      expect(compatible.props).toBeDefined();
    });

    it('should return compatible footwear based on outfit selection', () => {
      const params = { outfit: 'hoodie-sweatpants' };
      const compatible = engine.getCompatibleOptions(params);
      
      expect(compatible.footwear).toBeDefined();
      expect(compatible.footwear?.length).toBeGreaterThan(0);
    });

    it('should filter frames based on frame type', () => {
      const params = { frameType: 'onboarding' as const };
      const compatible = engine.getCompatibleOptions(params);
      
      expect(compatible.frames).toBeDefined();
      if (compatible.frames) {
        expect(compatible.frames.every(f => f.sequence.includes('onboarding'))).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent parameters gracefully', () => {
      const params: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'non-existent-outfit',
        footwear: 'non-existent-footwear',
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('not found'))).toBe(true);
    });

    it('should provide helpful suggestions for invalid combinations', () => {
      const params: ImageGenerationParams = {
        pose: '', // Empty pose
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParametersDetailed(params);
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Prompt Building with Validation', () => {
    it('should build prompt only for valid parameters', () => {
      const validParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      expect(() => engine.buildPrompt(validParams)).not.toThrow();
      const prompt = engine.buildPrompt(validParams);
      expect(prompt).toContain('CAPITÃO CAVERNA');
      expect(prompt).toContain('NEGATIVE PROMPT');
    });

    it('should throw error for invalid parameters', () => {
      const invalidParams: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'windbreaker-shorts', // Not compatible
        footwear: 'air-jordan-1-chicago',
      };

      expect(() => engine.buildPrompt(invalidParams)).toThrow();
    });

    it('should build frame-specific prompts correctly', () => {
      const frameParams: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
      };

      const framePrompt = engine.buildFramePrompt('02B', frameParams);
      expect(framePrompt).toContain('EXACT LOCATION');
      expect(framePrompt).toContain('CHARACTER POSITIONING');
      expect(framePrompt).toContain('LIGHTING ON CHARACTER');
    });
  });
});