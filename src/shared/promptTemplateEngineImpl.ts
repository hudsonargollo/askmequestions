import {
  ImageGenerationParams,
  PromptOptions,
  ValidationResult,
  FrameDefinition,
  PoseDefinition,
  OutfitDefinition,
  FootwearDefinition,
  PropDefinition,
} from './types';
import { PromptTemplateEngine } from './promptTemplateEngine';
import { PROMPT_FOUNDATION, TECHNICAL_SPECS, NEGATIVE_PROMPTS } from './promptFoundation';
import { validateParametersEnhanced } from './validation';

/**
 * Core implementation of the Prompt Template Engine
 * Integrates CAPITAO CAVERNA ULTIMATE PROMPTS with variable parameters
 */
export class PromptTemplateEngineImpl implements PromptTemplateEngine {
  private poses: Map<string, PoseDefinition> = new Map();
  private outfits: Map<string, OutfitDefinition> = new Map();
  private footwear: Map<string, FootwearDefinition> = new Map();
  private props: Map<string, PropDefinition> = new Map();
  private frames: Map<string, FrameDefinition> = new Map();

  constructor() {
    this.initializeDefaultOptions();
  }

  /**
   * Build a complete prompt from the given parameters
   */
  buildPrompt(params: ImageGenerationParams): string {
    const validation = this.validateParameters(params);
    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
    }

    const pose = this.poses.get(params.pose);
    const outfit = this.outfits.get(params.outfit);
    const footwear = this.footwear.get(params.footwear);
    const prop = params.prop ? this.props.get(params.prop) : undefined;
    const frame = params.frameId ? this.frames.get(params.frameId) : undefined;

    if (!pose || !outfit || !footwear) {
      throw new Error('Required pose, outfit, or footwear not found');
    }

    // Build the complete prompt
    const promptParts: string[] = [];

    // 1. Character Foundation (always first)
    promptParts.push(PROMPT_FOUNDATION.character);

    // 2. Pose-specific description
    promptParts.push(pose.promptFragment);

    // 3. Outfit description
    promptParts.push(outfit.promptFragment);

    // 4. Footwear description
    promptParts.push(footwear.promptFragment);

    // 5. Prop description (if present)
    if (prop) {
      promptParts.push(prop.promptFragment);
    }

    // 6. Frame-specific elements (if frame is specified)
    if (frame) {
      promptParts.push(this.buildFrameSpecificPrompt(frame));
    }

    // 7. Environment foundation
    promptParts.push(PROMPT_FOUNDATION.environment);

    // 8. Technical specifications
    const techSpec = this.getTechnicalSpecification(params.frameType);
    promptParts.push(techSpec);

    // 9. Brand accuracy requirements
    promptParts.push(PROMPT_FOUNDATION.brand);

    // 10. Technical rendering boost
    promptParts.push(PROMPT_FOUNDATION.technical);

    // Combine all parts with proper spacing
    const positivePrompt = promptParts.join('\n\n');

    // Add negative prompt
    const negativePrompt = this.buildNegativePrompt(params);

    return `${positivePrompt}\n\nNEGATIVE PROMPT: ${negativePrompt}`;
  }

  /**
   * Build frame-specific prompt with exact positioning and lighting
   */
  buildFramePrompt(frameId: string, params: ImageGenerationParams): string {
    const frame = this.frames.get(frameId);
    if (!frame) {
      throw new Error(`Frame ${frameId} not found`);
    }

    // Use the frame-specific parameters
    const frameParams: ImageGenerationParams = {
      ...params,
      frameId,
      frameType: frame.sequence.includes('onboarding') ? 'onboarding' : 'sequence',
    };

    return this.buildPrompt(frameParams);
  }

  /**
   * Build frame-specific prompt elements
   */
  private buildFrameSpecificPrompt(frame: FrameDefinition): string {
    const frameParts: string[] = [];

    // Exact location specification
    frameParts.push(`EXACT LOCATION: ${frame.location}`);

    // Character positioning
    frameParts.push(`CHARACTER POSITIONING: ${frame.positioning}`);

    // Limb metrics and pose specifics
    frameParts.push(`LIMB METRICS: ${frame.limbMetrics}`);
    frameParts.push(`POSE SPECIFICS: ${frame.poseSpecifics}`);

    // Facial expression
    frameParts.push(`FACIAL EXPRESSION: ${frame.facialExpression}`);

    // Lighting specifications
    frameParts.push(`LIGHTING ON CHARACTER: ${frame.lighting}`);

    // Camera specifications
    frameParts.push(`CAMERA: ${frame.camera}`);

    // Environmental touches
    frameParts.push(`ENVIRONMENTAL TOUCHES: ${frame.environmentalTouches}`);

    // Continuity notes if present
    if (frame.continuityNotes) {
      frameParts.push(`CONTINUITY: ${frame.continuityNotes}`);
    }

    return frameParts.join('\n');
  }

  /**
   * Get technical specification based on frame type
   */
  private getTechnicalSpecification(frameType?: string): string {
    switch (frameType) {
      case 'onboarding':
        return TECHNICAL_SPECS.onboarding;
      case 'sequence':
        return TECHNICAL_SPECS.sequence;
      default:
        return TECHNICAL_SPECS.standard;
    }
  }

  /**
   * Build comprehensive negative prompt
   */
  private buildNegativePrompt(params: ImageGenerationParams): string {
    const negativeElements: string[] = [];

    // Global negative prompt (always included)
    negativeElements.push(NEGATIVE_PROMPTS.global);

    // Specific negative prompts based on parameters
    negativeElements.push(NEGATIVE_PROMPTS.hands);
    negativeElements.push(NEGATIVE_PROMPTS.anatomy);
    negativeElements.push(NEGATIVE_PROMPTS.quality);
    negativeElements.push(NEGATIVE_PROMPTS.consistency);

    // Frame-specific negative prompts
    if (params.frameType === 'sequence') {
      negativeElements.push("inconsistent lighting across frames, character proportion changes, environmental discontinuity");
    }

    if (params.frameType === 'onboarding') {
      negativeElements.push("non-narrative composition, inconsistent storytelling elements, poor cinematic quality");
    }

    return negativeElements.join(', ');
  }

  /**
   * Validate parameter combinations for compatibility (enhanced version)
   */
  validateParametersDetailed(params: ImageGenerationParams) {
    return validateParametersEnhanced(
      params,
      Array.from(this.poses.values()),
      Array.from(this.outfits.values()),
      Array.from(this.footwear.values()),
      Array.from(this.props.values()),
      Array.from(this.frames.values())
    );
  }

  /**
   * Validate parameter combinations for compatibility
   */
  validateParameters(params: ImageGenerationParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!params.pose || params.pose.trim() === '') {
      errors.push('Pose is required');
      suggestions.push('Select a pose from the available options');
    }

    if (!params.outfit || params.outfit.trim() === '') {
      errors.push('Outfit is required');
      suggestions.push('Select an outfit from the available options');
    }

    if (!params.footwear || params.footwear.trim() === '') {
      errors.push('Footwear is required');
      suggestions.push('Select footwear from the available options');
    }

    // Check if selected items exist
    const pose = this.poses.get(params.pose);
    const outfit = this.outfits.get(params.outfit);
    const footwear = this.footwear.get(params.footwear);
    const prop = params.prop ? this.props.get(params.prop) : undefined;
    const frame = params.frameId ? this.frames.get(params.frameId) : undefined;

    if (params.pose && !pose) {
      errors.push(`Pose "${params.pose}" not found`);
    }

    if (params.outfit && !outfit) {
      errors.push(`Outfit "${params.outfit}" not found`);
    }

    if (params.footwear && !footwear) {
      errors.push(`Footwear "${params.footwear}" not found`);
    }

    if (params.prop && !prop) {
      errors.push(`Prop "${params.prop}" not found`);
    }

    if (params.frameId && !frame) {
      errors.push(`Frame "${params.frameId}" not found`);
    }

    // Compatibility checks
    if (pose && outfit) {
      if (!pose.compatibleOutfits.includes(outfit.id)) {
        errors.push(`Outfit "${outfit.name}" is not compatible with pose "${pose.name}"`);
        suggestions.push(`Try one of these compatible outfits: ${pose.compatibleOutfits.join(', ')}`);
      }
    }

    if (outfit && footwear) {
      if (!outfit.compatibleFootwear.includes(footwear.id)) {
        errors.push(`Footwear "${footwear.name}" is not compatible with outfit "${outfit.name}"`);
        suggestions.push(`Try one of these compatible footwear options: ${outfit.compatibleFootwear.join(', ')}`);
      }

      if (!footwear.compatibleOutfits.includes(outfit.id)) {
        warnings.push(`Footwear "${footwear.name}" may not look optimal with outfit "${outfit.name}"`);
      }
    }

    if (prop && pose) {
      if (!prop.compatiblePoses.includes(pose.id)) {
        errors.push(`Prop "${prop.name}" is not compatible with pose "${pose.name}"`);
        suggestions.push(`Try one of these compatible poses: ${prop.compatiblePoses.join(', ')}`);
      }
    }

    // Frame-specific validation
    if (frame) {
      // Check required props
      for (const requiredPropId of frame.requiredProps) {
        if (!params.prop || params.prop !== requiredPropId) {
          const requiredProp = this.props.get(requiredPropId);
          errors.push(`Frame "${frame.name}" requires prop "${requiredProp?.name || requiredPropId}"`);
          suggestions.push('Add the required prop to generate this frame');
        }
      }

      // Frame type consistency
      if (frame.id.startsWith('01') && params.frameType !== 'onboarding') {
        warnings.push('Frame appears to be an onboarding frame but frameType is not set to "onboarding"');
        suggestions.push('Set frameType to "onboarding" for consistency');
      }
    }

    // Frame type validation
    if (params.frameType === 'onboarding' && !params.frameId) {
      errors.push('Frame ID is required for onboarding frame type');
      suggestions.push('Select a specific frame ID for onboarding sequences');
    }

    if (params.frameType === 'sequence' && !params.frameId) {
      errors.push('Frame ID is required for sequence frame type');
      suggestions.push('Select a specific frame ID for sequence generation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : (errors.length > 0 ? ['Please check parameter compatibility and try again'] : undefined),
    };
  }

  /**
   * Get all available options for prompt generation
   */
  getAvailableOptions(): PromptOptions {
    return {
      poses: Array.from(this.poses.values()),
      outfits: Array.from(this.outfits.values()),
      footwear: Array.from(this.footwear.values()),
      props: Array.from(this.props.values()),
      frames: Array.from(this.frames.values()),
    };
  }

  /**
   * Get a specific frame definition by ID
   */
  getFrameDefinition(frameId: string): FrameDefinition | null {
    return this.frames.get(frameId) || null;
  }

  /**
   * Get compatible options based on current selections
   */
  getCompatibleOptions(params: Partial<ImageGenerationParams>): Partial<PromptOptions> {
    const compatible: Partial<PromptOptions> = {};

    // If pose is selected, filter compatible outfits
    if (params.pose) {
      const selectedPose = this.poses.get(params.pose);
      if (selectedPose) {
        compatible.outfits = Array.from(this.outfits.values())
          .filter(outfit => selectedPose.compatibleOutfits.includes(outfit.id));
      }
    }

    // If outfit is selected, filter compatible footwear
    if (params.outfit) {
      const selectedOutfit = this.outfits.get(params.outfit);
      if (selectedOutfit) {
        compatible.footwear = Array.from(this.footwear.values())
          .filter(footwear => selectedOutfit.compatibleFootwear.includes(footwear.id));
      }
    }

    // If pose is selected, filter compatible props
    if (params.pose) {
      const selectedPose = this.poses.get(params.pose);
      if (selectedPose) {
        compatible.props = Array.from(this.props.values())
          .filter(prop => prop.compatiblePoses.includes(selectedPose.id));
      }
    }

    // Filter frames based on frame type
    if (params.frameType) {
      compatible.frames = Array.from(this.frames.values())
        .filter(frame => {
          if (params.frameType === 'onboarding') {
            return frame.sequence.includes('onboarding');
          }
          if (params.frameType === 'sequence') {
            return frame.sequence.includes('sequence');
          }
          return true;
        });
    }

    return compatible;
  }

  /**
   * Initialize default options with sample data
   * In a real implementation, this would load from a database or configuration
   */
  private initializeDefaultOptions(): void {
    // Sample poses
    this.poses.set('arms-crossed', {
      id: 'arms-crossed',
      name: 'Arms Crossed',
      description: 'Confident stance with arms crossed over chest',
      category: 'primary',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts', 'windbreaker-shorts'],
      promptFragment: 'Standing confidently with arms crossed over chest, displaying authority and self-assurance, perfect posture with shoulders back',
    });

    this.poses.set('pointing-forward', {
      id: 'pointing-forward',
      name: 'Pointing Forward',
      description: 'Dynamic pose pointing forward with determination',
      category: 'primary',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts', 'windbreaker-shorts'],
      promptFragment: 'Pointing forward with right hand extended, determined expression, left hand at side, dynamic leadership pose',
    });

    this.poses.set('sitting-on-rock', {
      id: 'sitting-on-rock',
      name: 'Sitting on Rock',
      description: 'Relaxed pose sitting on a cave rock formation',
      category: 'primary',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts', 'windbreaker-shorts'],
      promptFragment: 'Sitting comfortably on a large granite rock formation, relaxed but alert posture, hands resting naturally',
    });

    this.poses.set('holding-cave-map', {
      id: 'holding-cave-map',
      name: 'Holding Cave Map',
      description: 'Onboarding pose holding and examining cave map',
      category: 'onboarding',
      compatibleOutfits: ['hoodie-sweatpants', 'windbreaker-shorts'],
      promptFragment: 'Holding an ancient cave map with both hands, studying it intently, slight forward lean showing engagement',
    });

    // Sample outfits
    this.outfits.set('hoodie-sweatpants', {
      id: 'hoodie-sweatpants',
      name: 'Hoodie + Sweatpants',
      description: 'Casual comfort outfit with hooded sweatshirt and matching sweatpants',
      promptFragment: 'Wearing a comfortable gray hooded sweatshirt with drawstrings, matching gray sweatpants with elastic waistband, relaxed fit clothing',
      compatibleFootwear: ['air-jordan-1-chicago', 'air-jordan-11-bred', 'nike-air-max-90', 'adidas-ultraboost'],
    });

    this.outfits.set('tshirt-shorts', {
      id: 'tshirt-shorts',
      name: 'T-shirt + Shorts',
      description: 'Active casual outfit with fitted t-shirt and athletic shorts',
      promptFragment: 'Wearing a fitted gray t-shirt with crew neck, athletic shorts in matching gray, comfortable active wear',
      compatibleFootwear: ['air-jordan-1-chicago', 'nike-air-max-90', 'adidas-ultraboost'],
    });

    this.outfits.set('windbreaker-shorts', {
      id: 'windbreaker-shorts',
      name: 'Windbreaker + Shorts',
      description: 'Athletic outfit with lightweight windbreaker and sports shorts',
      promptFragment: 'Wearing a lightweight gray windbreaker jacket with subtle texture, athletic shorts, sporty and functional appearance',
      compatibleFootwear: ['air-jordan-11-bred', 'nike-air-max-90', 'adidas-ultraboost'],
    });

    // Sample footwear
    this.footwear.set('air-jordan-1-chicago', {
      id: 'air-jordan-1-chicago',
      name: 'Air Jordan 1 Chicago',
      description: 'Classic Air Jordan 1 in Chicago colorway',
      brand: 'Nike',
      model: 'Air Jordan 1',
      promptFragment: 'Wearing authentic Air Jordan 1 sneakers in Chicago colorway (white, black, and red), high-top basketball shoes with Nike swoosh, premium leather construction',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts'],
    });

    this.footwear.set('air-jordan-11-bred', {
      id: 'air-jordan-11-bred',
      name: 'Air Jordan 11 Bred',
      description: 'Air Jordan 11 in Bred (black and red) colorway',
      brand: 'Nike',
      model: 'Air Jordan 11',
      promptFragment: 'Wearing Air Jordan 11 sneakers in Bred colorway (black patent leather with red accents), iconic basketball shoes with carbon fiber plate',
      compatibleOutfits: ['hoodie-sweatpants', 'windbreaker-shorts'],
    });

    this.footwear.set('nike-air-max-90', {
      id: 'nike-air-max-90',
      name: 'Nike Air Max 90',
      description: 'Classic Nike Air Max 90 running shoes',
      brand: 'Nike',
      model: 'Air Max 90',
      promptFragment: 'Wearing Nike Air Max 90 sneakers in classic white and gray colorway, visible air cushioning in heel, retro running shoe design',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts', 'windbreaker-shorts'],
    });

    this.footwear.set('adidas-ultraboost', {
      id: 'adidas-ultraboost',
      name: 'Adidas Ultraboost',
      description: 'Modern Adidas Ultraboost running shoes',
      brand: 'Adidas',
      model: 'Ultraboost',
      promptFragment: 'Wearing Adidas Ultraboost sneakers in core black colorway, Boost midsole technology, Primeknit upper, three stripes branding',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts', 'windbreaker-shorts'],
    });

    // Sample props
    this.props.set('cave-map', {
      id: 'cave-map',
      name: 'Cave Map',
      description: 'Ancient parchment map of cave systems',
      category: 'onboarding',
      promptFragment: 'Holding an aged parchment cave map with intricate tunnel drawings, mysterious symbols, and weathered edges',
      compatiblePoses: ['holding-cave-map', 'pointing-forward'],
    });

    this.props.set('glowing-hourglass', {
      id: 'glowing-hourglass',
      name: 'Glowing Hourglass',
      description: 'Mystical hourglass with glowing sand',
      category: 'onboarding',
      promptFragment: 'Mystical hourglass with glowing amber sand, ornate bronze frame, emanating soft magical light',
      compatiblePoses: ['arms-crossed', 'holding-cave-map'],
    });

    this.props.set('stone-totem', {
      id: 'stone-totem',
      name: 'Stone Totem',
      description: 'Ancient carved stone totem with mystical properties',
      category: 'onboarding',
      promptFragment: 'Ancient stone totem with intricate carvings, mystical runes, weathered granite surface with subtle magical glow',
      compatiblePoses: ['sitting-on-rock', 'arms-crossed'],
    });

    // Sample frames
    this.frames.set('01A', {
      id: '01A',
      name: 'Welcome Introduction',
      sequence: 'onboarding-welcome',
      location: 'Central cave chamber with dramatic crystal formations overhead',
      positioning: 'Center frame, facing camera at slight angle, confident stance',
      limbMetrics: 'Arms at sides, slight forward lean, feet shoulder-width apart',
      poseSpecifics: 'Welcoming gesture with slight smile, eyes making direct contact with viewer',
      facialExpression: 'Warm, confident smile with bright red eyes showing intelligence and friendliness',
      lighting: 'Dramatic overhead crystal lighting creating heroic silhouette, warm amber glow',
      camera: 'Medium shot, eye level, slight low angle to emphasize authority',
      environmentalTouches: 'Sparkling crystal formations, subtle mist, ancient cave architecture visible',
      voiceover: 'Welcome to the depths of knowledge, explorer. I am Capitão Caverna, your guide through these ancient halls of wisdom.',
      requiredProps: [],
      continuityNotes: 'Establish character presence and cave environment for subsequent frames',
    });

    this.frames.set('02B', {
      id: '02B',
      name: 'Map Presentation',
      sequence: 'onboarding-navigation',
      location: 'Near cave wall with ancient markings, map pedestal visible',
      positioning: 'Three-quarter turn toward map, gesture toward cave systems',
      limbMetrics: 'Right arm extended toward map, left hand at side, slight step forward',
      poseSpecifics: 'Presenting cave map with authority, educational pose',
      facialExpression: 'Focused and instructive, slight smile, eyes alternating between map and viewer',
      lighting: 'Focused lighting on map and character, dramatic shadows on cave wall',
      camera: 'Medium-wide shot showing both character and map context',
      environmentalTouches: 'Ancient cave paintings visible on walls, map pedestal with mystical glow',
      voiceover: 'These passages hold centuries of accumulated knowledge. Let me show you how to navigate them effectively.',
      requiredProps: ['cave-map'],
      continuityNotes: 'Maintain consistent lighting direction from frame 01A',
    });
  }

  /**
   * Add a new pose definition
   */
  addPose(pose: PoseDefinition): void {
    this.poses.set(pose.id, pose);
  }

  /**
   * Add a new outfit definition
   */
  addOutfit(outfit: OutfitDefinition): void {
    this.outfits.set(outfit.id, outfit);
  }

  /**
   * Add a new footwear definition
   */
  addFootwear(footwear: FootwearDefinition): void {
    this.footwear.set(footwear.id, footwear);
  }

  /**
   * Add a new prop definition
   */
  addProp(prop: PropDefinition): void {
    this.props.set(prop.id, prop);
  }

  /**
   * Add a new frame definition
   */
  addFrame(frame: FrameDefinition): void {
    this.frames.set(frame.id, frame);
  }
}