import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateEngineImpl } from '../promptTemplateEngineImpl';
import {
  ImageGenerationParams,
  PoseDefinition,
  OutfitDefinition,
  FootwearDefinition,
  PropDefinition,
  FrameDefinition,
} from '../types';

describe('PromptTemplateEngineImpl', () => {
  let engine: PromptTemplateEngineImpl;

  beforeEach(() => {
    engine = new PromptTemplateEngineImpl();
  });

  describe('buildPrompt', () => {
    it('should build a complete prompt with all required elements', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('Standing confidently with arms crossed');
      expect(prompt).toContain('Wearing a comfortable gray hooded sweatshirt');
      expect(prompt).toContain('Wearing authentic Air Jordan 1 sneakers');
      expect(prompt).toContain('NEGATIVE PROMPT:');
    });

    it('should include prop description when prop is specified', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('Holding an aged parchment cave map');
    });

    it('should include frame-specific elements when frameId is specified', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameId: '01A',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('EXACT LOCATION:');
      expect(prompt).toContain('CHARACTER POSITIONING:');
      expect(prompt).toContain('LIGHTING ON CHARACTER:');
    });

    it('should throw error for invalid parameters', () => {
      const params: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      expect(() => engine.buildPrompt(params)).toThrow('Invalid parameters');
    });

    it('should throw error for missing required elements', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'non-existent-outfit',
        footwear: 'air-jordan-1-chicago',
      };

      expect(() => engine.buildPrompt(params)).toThrow('Invalid parameters');
    });
  });

  describe('buildFramePrompt', () => {
    it('should build frame-specific prompt', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
      };

      const prompt = engine.buildFramePrompt('02B', params);

      expect(prompt).toContain('Near cave wall with ancient markings');
      expect(prompt).toContain('Three-quarter turn toward map');
      expect(prompt).toContain('Focused lighting on map');
    });

    it('should throw error for non-existent frame', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      expect(() => engine.buildFramePrompt('99Z', params)).toThrow('Frame 99Z not found');
    });
  });

  describe('validateParameters', () => {
    it('should validate compatible parameter combinations', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const params: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pose is required');
    });

    it('should detect incompatible pose-outfit combinations', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map', // Only compatible with hoodie-sweatpants
        outfit: 'tshirt-shorts',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not compatible'))).toBe(true);
    });

    it('should detect incompatible outfit-footwear combinations', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants', // Compatible with jordan-1, air-max-90
        footwear: 'adidas-ultraboost', // Not compatible with hoodie-sweatpants
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not compatible'))).toBe(true);
    });

    it('should validate frame requirements', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameId: '02B', // Requires cave-map prop
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('requires prop'))).toBe(true);
    });

    it('should provide helpful suggestions', () => {
      const params: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const result = engine.validateParameters(params);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableOptions', () => {
    it('should return all available options', () => {
      const options = engine.getAvailableOptions();

      expect(options.poses.length).toBeGreaterThan(0);
      expect(options.outfits.length).toBeGreaterThan(0);
      expect(options.footwear.length).toBeGreaterThan(0);
      expect(options.props.length).toBeGreaterThan(0);
      expect(options.frames.length).toBeGreaterThan(0);
    });

    it('should return properly structured pose definitions', () => {
      const options = engine.getAvailableOptions();
      const pose = options.poses[0];

      expect(pose).toHaveProperty('id');
      expect(pose).toHaveProperty('name');
      expect(pose).toHaveProperty('description');
      expect(pose).toHaveProperty('category');
      expect(pose).toHaveProperty('compatibleOutfits');
      expect(pose).toHaveProperty('promptFragment');
    });
  });

  describe('getFrameDefinition', () => {
    it('should return frame definition for valid frame ID', () => {
      const frame = engine.getFrameDefinition('01A');

      expect(frame).toBeDefined();
      expect(frame!.id).toBe('01A');
      expect(frame!.name).toBe('Welcome Introduction');
    });

    it('should return null for invalid frame ID', () => {
      const frame = engine.getFrameDefinition('99Z');

      expect(frame).toBeNull();
    });
  });

  describe('getCompatibleOptions', () => {
    it('should return compatible outfits for selected pose', () => {
      const params = { pose: 'arms-crossed' };
      const compatible = engine.getCompatibleOptions(params);

      expect(compatible.outfits).toBeDefined();
      expect(compatible.outfits!.length).toBeGreaterThan(0);
      expect(compatible.outfits!.length).toBeGreaterThan(0);
      expect(compatible.outfits!.some(outfit => 
        outfit.id === 'hoodie-sweatpants' || outfit.id === 'tshirt-shorts'
      )).toBe(true);
    });

    it('should return compatible footwear for selected outfit', () => {
      const params = { outfit: 'hoodie-sweatpants' };
      const compatible = engine.getCompatibleOptions(params);

      expect(compatible.footwear).toBeDefined();
      expect(compatible.footwear!.length).toBeGreaterThan(0);
      expect(compatible.footwear!.every(footwear => 
        footwear.id === 'air-jordan-1-chicago' || footwear.id === 'air-jordan-11-bred' || footwear.id === 'nike-air-max-90'
      )).toBe(true);
    });

    it('should return compatible props for selected pose', () => {
      const params = { pose: 'holding-cave-map' };
      const compatible = engine.getCompatibleOptions(params);

      expect(compatible.props).toBeDefined();
      expect(compatible.props!.length).toBeGreaterThan(0);
      expect(compatible.props!.some(prop => prop.id === 'cave-map')).toBe(true);
    });

    it('should filter frames by frame type', () => {
      const params = { frameType: 'onboarding' as const };
      const compatible = engine.getCompatibleOptions(params);

      expect(compatible.frames).toBeDefined();
      expect(compatible.frames!.every(frame => 
        frame.sequence.includes('onboarding')
      )).toBe(true);
    });
  });

  describe('addPose', () => {
    it('should add new pose definition', () => {
      const newPose: PoseDefinition = {
        id: 'test-pose',
        name: 'Test Pose',
        description: 'A test pose',
        category: 'primary',
        compatibleOutfits: ['hoodie-sweatpants'],
        promptFragment: 'Test pose fragment',
      };

      engine.addPose(newPose);
      const options = engine.getAvailableOptions();

      expect(options.poses.some(pose => pose.id === 'test-pose')).toBe(true);
    });
  });

  describe('addOutfit', () => {
    it('should add new outfit definition', () => {
      const newOutfit: OutfitDefinition = {
        id: 'test-outfit',
        name: 'Test Outfit',
        description: 'A test outfit',
        promptFragment: 'Test outfit fragment',
        compatibleFootwear: ['air-jordan-1-chicago'],
      };

      engine.addOutfit(newOutfit);
      const options = engine.getAvailableOptions();

      expect(options.outfits.some(outfit => outfit.id === 'test-outfit')).toBe(true);
    });
  });

  describe('addFootwear', () => {
    it('should add new footwear definition', () => {
      const newFootwear: FootwearDefinition = {
        id: 'test-footwear',
        name: 'Test Footwear',
        description: 'Test footwear',
        brand: 'Test Brand',
        model: 'Test Model',
        promptFragment: 'Test footwear fragment',
        compatibleOutfits: ['hoodie-sweatpants'],
      };

      engine.addFootwear(newFootwear);
      const options = engine.getAvailableOptions();

      expect(options.footwear.some(footwear => footwear.id === 'test-footwear')).toBe(true);
    });
  });

  describe('addProp', () => {
    it('should add new prop definition', () => {
      const newProp: PropDefinition = {
        id: 'test-prop',
        name: 'Test Prop',
        description: 'A test prop',
        category: 'general',
        promptFragment: 'Test prop fragment',
        compatiblePoses: ['arms-crossed'],
      };

      engine.addProp(newProp);
      const options = engine.getAvailableOptions();

      expect(options.props.some(prop => prop.id === 'test-prop')).toBe(true);
    });
  });

  describe('addFrame', () => {
    it('should add new frame definition', () => {
      const newFrame: FrameDefinition = {
        id: 'TEST',
        name: 'Test Frame',
        sequence: 'test-sequence',
        location: 'Test location',
        positioning: 'Test positioning',
        limbMetrics: 'Test limb metrics',
        poseSpecifics: 'Test pose specifics',
        facialExpression: 'Test expression',
        lighting: 'Test lighting',
        camera: 'Test camera',
        environmentalTouches: 'Test environment',
        requiredProps: [],
      };

      engine.addFrame(newFrame);
      const options = engine.getAvailableOptions();

      expect(options.frames.some(frame => frame.id === 'TEST')).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty parameter combinations gracefully', () => {
      const params: ImageGenerationParams = {
        pose: '',
        outfit: '',
        footwear: '',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined props gracefully', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: undefined,
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle frame type without frame ID', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameType: 'onboarding',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Frame ID is required'))).toBe(true);
    });

    it('should handle sequence frame type without frame ID', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameType: 'sequence',
      };

      const result = engine.validateParameters(params);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Frame ID is required'))).toBe(true);
    });
  });

  describe('prompt construction quality', () => {
    it('should include all foundation elements in correct order', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const prompt = engine.buildPrompt(params);
      const lines = prompt.split('\n\n');

      // Check that foundation elements appear in expected order
      expect(lines[0]).toContain('Confident gray and cream wolf'); // Character foundation should be first
      expect(prompt).toContain('Standing confidently with arms crossed'); // Pose
      expect(prompt).toContain('Wearing a comfortable gray hooded sweatshirt'); // Outfit
      expect(prompt).toContain('Wearing authentic Air Jordan 1 sneakers'); // Footwear
    });

    it('should include proper negative prompts', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('NEGATIVE PROMPT:');
      expect(prompt).toContain('deformed hands');
      expect(prompt).toContain('unrealistic anatomy');
      expect(prompt).toContain('poor quality');
    });

    it('should include frame-specific negative prompts for sequences', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        frameType: 'sequence',
        frameId: '01A',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('inconsistent lighting across frames');
      expect(prompt).toContain('character proportion changes');
    });

    it('should include onboarding-specific negative prompts', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-cave-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'air-jordan-1-chicago',
        prop: 'cave-map',
        frameType: 'onboarding',
        frameId: '02B',
      };

      const prompt = engine.buildPrompt(params);

      expect(prompt).toContain('non-narrative composition');
      expect(prompt).toContain('inconsistent storytelling elements');
    });
  });
});