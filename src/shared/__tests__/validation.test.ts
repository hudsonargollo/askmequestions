import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateBasicParameters,
  validatePoseOutfitCompatibility,
  validateOutfitFootwearCompatibility,
  validatePropPoseCompatibility,
  validateFrameRequirements,
  validateParameters,
  validateParametersSimple,
  validateBrandConsistency,
  validateTechnicalCompatibility,
  validateVisualOptimization,
  validateParametersEnhanced,
} from '../validation';
import {
  ImageGenerationParams,
  PoseDefinition,
  OutfitDefinition,
  FootwearDefinition,
  PropDefinition,
  FrameDefinition,
} from '../types';

describe('Parameter Validation', () => {
  let samplePoses: PoseDefinition[];
  let sampleOutfits: OutfitDefinition[];
  let sampleFootwear: FootwearDefinition[];
  let sampleProps: PropDefinition[];
  let sampleFrames: FrameDefinition[];

  beforeEach(() => {
    // Sample test data
    samplePoses = [
      {
        id: 'arms-crossed',
        name: 'Arms Crossed',
        description: 'Confident stance with arms crossed',
        category: 'primary',
        compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts'],
        promptFragment: 'Arms crossed confidently',
      },
      {
        id: 'pointing-forward',
        name: 'Pointing Forward',
        description: 'Dynamic pointing pose',
        category: 'primary',
        compatibleOutfits: ['tshirt-shorts', 'windbreaker-shorts'],
        promptFragment: 'Pointing forward dynamically',
      },
      {
        id: 'holding-map',
        name: 'Holding Map',
        description: 'Onboarding pose with map',
        category: 'onboarding',
        compatibleOutfits: ['hoodie-sweatpants'],
        promptFragment: 'Holding cave map',
      },
    ];

    sampleOutfits = [
      {
        id: 'hoodie-sweatpants',
        name: 'Hoodie + Sweatpants',
        description: 'Casual comfort outfit',
        promptFragment: 'Wearing hoodie and sweatpants',
        compatibleFootwear: ['jordan-1', 'air-max-90'],
      },
      {
        id: 'tshirt-shorts',
        name: 'T-shirt + Shorts',
        description: 'Active casual outfit',
        promptFragment: 'Wearing t-shirt and shorts',
        compatibleFootwear: ['jordan-1', 'ultraboost'],
      },
      {
        id: 'windbreaker-shorts',
        name: 'Windbreaker + Shorts',
        description: 'Athletic outfit',
        promptFragment: 'Wearing windbreaker and shorts',
        compatibleFootwear: ['air-max-90', 'ultraboost'],
      },
    ];

    sampleFootwear = [
      {
        id: 'jordan-1',
        name: 'Air Jordan 1',
        description: 'Classic basketball shoes',
        brand: 'Nike',
        model: 'Air Jordan 1',
        promptFragment: 'Wearing Air Jordan 1 sneakers',
        compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts'],
      },
      {
        id: 'air-max-90',
        name: 'Air Max 90',
        description: 'Retro running shoes',
        brand: 'Nike',
        model: 'Air Max 90',
        promptFragment: 'Wearing Air Max 90 sneakers',
        compatibleOutfits: ['hoodie-sweatpants', 'windbreaker-shorts'],
      },
      {
        id: 'ultraboost',
        name: 'Ultraboost',
        description: 'Modern running shoes',
        brand: 'Adidas',
        model: 'Ultraboost',
        promptFragment: 'Wearing Ultraboost sneakers',
        compatibleOutfits: ['tshirt-shorts', 'windbreaker-shorts'],
      },
    ];

    sampleProps = [
      {
        id: 'cave-map',
        name: 'Cave Map',
        description: 'Ancient cave map',
        category: 'onboarding',
        promptFragment: 'Holding ancient cave map',
        compatiblePoses: ['holding-map', 'pointing-forward'],
      },
      {
        id: 'crystal-orb',
        name: 'Crystal Orb',
        description: 'Mystical crystal orb',
        category: 'general',
        promptFragment: 'Holding glowing crystal orb',
        compatiblePoses: ['arms-crossed'],
      },
    ];

    sampleFrames = [
      {
        id: '01A',
        name: 'Welcome Frame',
        sequence: 'onboarding-intro',
        location: 'Central cave chamber',
        positioning: 'Center frame, facing camera',
        limbMetrics: 'Arms at sides, confident stance',
        poseSpecifics: 'Welcoming gesture',
        facialExpression: 'Warm smile',
        lighting: 'Dramatic overhead lighting',
        camera: 'Medium shot, eye level',
        environmentalTouches: 'Crystal formations visible',
        voiceover: 'Welcome to the cave',
        requiredProps: [],
        continuityNotes: 'Establish character presence',
      },
      {
        id: '02B',
        name: 'Map Introduction',
        sequence: 'onboarding-navigation',
        location: 'Near cave wall with markings',
        positioning: 'Three-quarter turn toward map',
        limbMetrics: 'Right arm extended toward map',
        poseSpecifics: 'Presenting map with authority',
        facialExpression: 'Focused and instructive',
        lighting: 'Focused lighting on map',
        camera: 'Medium-wide shot',
        environmentalTouches: 'Ancient cave paintings visible',
        voiceover: 'Let me show you the passages',
        requiredProps: ['cave-map'],
        continuityNotes: 'Maintain lighting direction',
      },
    ];
  });

  describe('validateBasicParameters', () => {
    it('should pass validation for complete valid parameters', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
      };

      const errors = validateBasicParameters(params);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const params: ImageGenerationParams = {
        pose: '',
        outfit: '',
        footwear: '',
      };

      const errors = validateBasicParameters(params);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.field)).toEqual(['pose', 'outfit', 'footwear']);
      expect(errors.every(e => e.severity === 'error')).toBe(true);
    });

    it('should require frameId for onboarding frameType', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameType: 'onboarding',
      };

      const errors = validateBasicParameters(params);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('frameId');
      expect(errors[0].severity).toBe('error');
    });

    it('should require frameId for sequence frameType', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameType: 'sequence',
      };

      const errors = validateBasicParameters(params);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('frameId');
      expect(errors[0].severity).toBe('error');
    });
  });

  describe('validatePoseOutfitCompatibility', () => {
    it('should pass for compatible pose-outfit combination', () => {
      const pose = samplePoses[0]; // arms-crossed
      const outfit = sampleOutfits[0]; // hoodie-sweatpants

      const errors = validatePoseOutfitCompatibility(pose, outfit);
      expect(errors).toHaveLength(0);
    });

    it('should fail for incompatible pose-outfit combination', () => {
      const pose = samplePoses[0]; // arms-crossed (compatible with hoodie-sweatpants, tshirt-shorts)
      const outfit = sampleOutfits[2]; // windbreaker-shorts

      const errors = validatePoseOutfitCompatibility(pose, outfit);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('outfit');
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('not compatible');
    });
  });

  describe('validateOutfitFootwearCompatibility', () => {
    it('should pass for compatible outfit-footwear combination', () => {
      const outfit = sampleOutfits[0]; // hoodie-sweatpants
      const footwear = sampleFootwear[0]; // jordan-1

      const errors = validateOutfitFootwearCompatibility(outfit, footwear);
      expect(errors).toHaveLength(0);
    });

    it('should fail for incompatible outfit-footwear combination', () => {
      const outfit = sampleOutfits[0]; // hoodie-sweatpants (compatible with jordan-1, air-max-90)
      const footwear = sampleFootwear[2]; // ultraboost

      const errors = validateOutfitFootwearCompatibility(outfit, footwear);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'footwear' && e.severity === 'error')).toBe(true);
    });

    it('should warn for footwear that does not support outfit', () => {
      const outfit = sampleOutfits[2]; // windbreaker-shorts
      const footwear = sampleFootwear[0]; // jordan-1 (does not list windbreaker-shorts in compatibleOutfits)

      const errors = validateOutfitFootwearCompatibility(outfit, footwear);
      expect(errors.some(e => e.severity === 'warning')).toBe(true);
    });
  });

  describe('validatePropPoseCompatibility', () => {
    it('should pass for compatible prop-pose combination', () => {
      const prop = sampleProps[0]; // cave-map
      const pose = samplePoses[2]; // holding-map

      const errors = validatePropPoseCompatibility(prop, pose);
      expect(errors).toHaveLength(0);
    });

    it('should fail for incompatible prop-pose combination', () => {
      const prop = sampleProps[1]; // crystal-orb (compatible with arms-crossed)
      const pose = samplePoses[1]; // pointing-forward

      const errors = validatePropPoseCompatibility(prop, pose);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('prop');
      expect(errors[0].severity).toBe('error');
    });
  });

  describe('validateFrameRequirements', () => {
    it('should pass for frame with no required props', () => {
      const frame = sampleFrames[0]; // 01A (no required props)
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameId: '01A',
      };

      const errors = validateFrameRequirements(frame, params, sampleProps);
      expect(errors).toHaveLength(0);
    });

    it('should fail for frame with missing required props', () => {
      const frame = sampleFrames[1]; // 02B (requires cave-map)
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameId: '02B',
      };

      const errors = validateFrameRequirements(frame, params, sampleProps);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('prop');
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('requires prop');
    });

    it('should pass for frame with required props present', () => {
      const frame = sampleFrames[1]; // 02B (requires cave-map)
      const params: ImageGenerationParams = {
        pose: 'holding-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameId: '02B',
        prop: 'cave-map',
      };

      const errors = validateFrameRequirements(frame, params, sampleProps);
      expect(errors).toHaveLength(0);
    });

    it('should warn for frameType inconsistency', () => {
      const frame = sampleFrames[0]; // 01A (onboarding frame)
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameId: '01A',
        frameType: 'standard', // Should be 'onboarding'
      };

      const errors = validateFrameRequirements(frame, params, sampleProps);
      expect(errors.some(e => e.severity === 'warning')).toBe(true);
    });
  });

  describe('validateParameters (comprehensive)', () => {
    it('should pass for completely valid parameters', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
      };

      const result = validateParameters(
        params,
        samplePoses,
        sampleOutfits,
        sampleFootwear,
        sampleProps,
        sampleFrames
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      expect(result.compatibility?.isCompatible).toBe(true);
    });

    it('should fail for non-existent pose', () => {
      const params: ImageGenerationParams = {
        pose: 'non-existent-pose',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
      };

      const result = validateParameters(
        params,
        samplePoses,
        sampleOutfits,
        sampleFootwear,
        sampleProps,
        sampleFrames
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'pose' && e.message.includes('not found'))).toBe(true);
    });

    it('should provide alternative options for incompatible combinations', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed', // Compatible with hoodie-sweatpants, tshirt-shorts
        outfit: 'windbreaker-shorts', // Not compatible with arms-crossed
        footwear: 'jordan-1',
      };

      const result = validateParameters(
        params,
        samplePoses,
        sampleOutfits,
        sampleFootwear,
        sampleProps,
        sampleFrames
      );

      expect(result.isValid).toBe(false);
      expect(result.alternativeOptions?.outfits).toEqual(['hoodie-sweatpants', 'tshirt-shorts']);
    });

    it('should validate complex frame scenario', () => {
      const params: ImageGenerationParams = {
        pose: 'holding-map',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameId: '02B',
        frameType: 'onboarding',
        prop: 'cave-map',
      };

      const result = validateParameters(
        params,
        samplePoses,
        sampleOutfits,
        sampleFootwear,
        sampleProps,
        sampleFrames
      );

      expect(result.isValid).toBe(true);
      expect(result.compatibility?.isCompatible).toBe(true);
    });

    it('should provide helpful suggestions', () => {
      const params: ImageGenerationParams = {
        pose: '', // Missing pose
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
      };

      const result = validateParameters(
        params,
        samplePoses,
        sampleOutfits,
        sampleFootwear,
        sampleProps,
        sampleFrames
      );

      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('Start by selecting a pose, as it determines compatible outfits and props');
    });
  });

  describe('validateParametersSimple (backward compatibility)', () => {
    it('should provide simple validation result', () => {
      const params: ImageGenerationParams = {
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
      };

      const result = validateParametersSimple(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return errors and warnings in simple format', () => {
      const params: ImageGenerationParams = {
        pose: '',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1',
        frameType: 'onboarding', // Missing frameId
      };

      const result = validateParametersSimple(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Validation Functions', () => {
    describe('validateBrandConsistency', () => {
      it('should pass for consistent style combinations', () => {
        const pose = samplePoses[0]; // arms-crossed
        const outfit = sampleOutfits[0]; // hoodie-sweatpants (casual)
        const footwear = sampleFootwear[0]; // jordan-1 (basketball)

        const errors = validateBrandConsistency(pose, outfit, footwear);
        expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
      });

      it('should warn for style mismatches', () => {
        const pose = samplePoses[0]; // arms-crossed
        const outfit = sampleOutfits[2]; // windbreaker-shorts (athletic)
        const footwear = sampleFootwear[0]; // jordan-1 (basketball)

        const errors = validateBrandConsistency(pose, outfit, footwear);
        // This might generate warnings depending on style compatibility
        expect(errors.every(e => e.severity === 'warning' || e.severity === 'info')).toBe(true);
      });

      it('should warn for narrative inconsistency', () => {
        const pose = samplePoses[2]; // holding-map (onboarding)
        const outfit = sampleOutfits[0]; // hoodie-sweatpants
        const footwear = sampleFootwear[0]; // jordan-1
        const prop = sampleProps[1]; // crystal-orb (general, not onboarding)

        const errors = validateBrandConsistency(pose, outfit, footwear, prop);
        expect(errors.some(e => e.message.includes('Narrative inconsistency'))).toBe(true);
      });
    });

    describe('validateTechnicalCompatibility', () => {
      it('should fail for sequence frameType without frameId', () => {
        const params: ImageGenerationParams = {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'jordan-1',
          frameType: 'sequence',
        };

        const errors = validateTechnicalCompatibility(params);
        expect(errors.some(e => e.field === 'frameId' && e.severity === 'error')).toBe(true);
      });

      it('should detect prop-pose technical conflicts', () => {
        const params: ImageGenerationParams = {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'jordan-1',
          prop: 'cave-map', // Cannot hold map with arms crossed
        };

        const errors = validateTechnicalCompatibility(params);
        expect(errors.some(e => e.message.includes('Technical conflict'))).toBe(true);
      });
    });

    describe('validateVisualOptimization', () => {
      it('should warn for visually heavy combinations', () => {
        const pose = samplePoses[0]; // arms-crossed
        const outfit = sampleOutfits[0]; // hoodie-sweatpants (visually heavy)
        const footwear = sampleFootwear[0]; // jordan-1 (visually heavy)

        const errors = validateVisualOptimization(pose, outfit, footwear);
        expect(errors.some(e => e.message.includes('Visual balance concern'))).toBe(true);
      });

      it('should warn for camera-pose mismatches', () => {
        const pose = { ...samplePoses[0], name: 'Full Body Stance' };
        const outfit = sampleOutfits[0];
        const footwear = sampleFootwear[0];
        const frame = { ...sampleFrames[0], camera: 'close-up shot, detailed facial features' };

        const errors = validateVisualOptimization(pose, outfit, footwear, frame);
        expect(errors.some(e => e.message.includes('Camera-pose mismatch'))).toBe(true);
      });
    });

    describe('validateParametersEnhanced', () => {
      it('should provide comprehensive validation with all layers', () => {
        const params: ImageGenerationParams = {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'jordan-1',
        };

        const result = validateParametersEnhanced(
          params,
          samplePoses,
          sampleOutfits,
          sampleFootwear,
          sampleProps,
          sampleFrames
        );

        expect(result.isValid).toBeDefined();
        expect(result.errors).toBeDefined();
        expect(result.compatibility).toBeDefined();
        expect(result.suggestions).toBeDefined();
      });

      it('should detect complex validation issues', () => {
        const params: ImageGenerationParams = {
          pose: 'arms-crossed',
          outfit: 'hoodie-sweatpants',
          footwear: 'jordan-1',
          prop: 'cave-map', // Technical conflict with arms-crossed
          frameType: 'sequence', // Missing frameId
        };

        const result = validateParametersEnhanced(
          params,
          samplePoses,
          sampleOutfits,
          sampleFootwear,
          sampleProps,
          sampleFrames
        );

        expect(result.isValid).toBe(false);
        expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
      });
    });
  });
});