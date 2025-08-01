import {
  ImageGenerationParams,
  ValidationResult,
  DetailedValidationResult,
  ValidationError,
  ParameterCompatibility,
  PoseDefinition,
  OutfitDefinition,
  FootwearDefinition,
  PropDefinition,
  FrameDefinition,
} from './types';

/**
 * Core validation functions for parameter combinations
 */

/**
 * Validates basic parameter structure and required fields
 */
export function validateBasicParameters(params: ImageGenerationParams): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!params.pose || params.pose.trim() === '') {
    errors.push({
      field: 'pose',
      message: 'Pose is required',
      severity: 'error',
      suggestion: 'Select a pose from the available options',
    });
  }

  if (!params.outfit || params.outfit.trim() === '') {
    errors.push({
      field: 'outfit',
      message: 'Outfit is required',
      severity: 'error',
      suggestion: 'Select an outfit from the available options',
    });
  }

  if (!params.footwear || params.footwear.trim() === '') {
    errors.push({
      field: 'footwear',
      message: 'Footwear is required',
      severity: 'error',
      suggestion: 'Select footwear from the available options',
    });
  }

  // Frame-specific validations
  if (params.frameType === 'onboarding' && !params.frameId) {
    errors.push({
      field: 'frameId',
      message: 'Frame ID is required for onboarding frame type',
      severity: 'error',
      suggestion: 'Select a specific frame ID for onboarding sequences',
    });
  }

  if (params.frameType === 'sequence' && !params.frameId) {
    errors.push({
      field: 'frameId',
      message: 'Frame ID is required for sequence frame type',
      severity: 'error',
      suggestion: 'Select a specific frame ID for sequence generation',
    });
  }

  return errors;
}

/**
 * Validates compatibility between pose and outfit
 */
export function validatePoseOutfitCompatibility(
  pose: PoseDefinition,
  outfit: OutfitDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!pose.compatibleOutfits.includes(outfit.id)) {
    errors.push({
      field: 'outfit',
      message: `Outfit "${outfit.name}" is not compatible with pose "${pose.name}"`,
      severity: 'error',
      suggestion: `Try one of these compatible outfits: ${pose.compatibleOutfits.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validates compatibility between outfit and footwear
 */
export function validateOutfitFootwearCompatibility(
  outfit: OutfitDefinition,
  footwear: FootwearDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!outfit.compatibleFootwear.includes(footwear.id)) {
    errors.push({
      field: 'footwear',
      message: `Footwear "${footwear.name}" is not compatible with outfit "${outfit.name}"`,
      severity: 'error',
      suggestion: `Try one of these compatible footwear options: ${outfit.compatibleFootwear.join(', ')}`,
    });
  }

  if (!footwear.compatibleOutfits.includes(outfit.id)) {
    errors.push({
      field: 'footwear',
      message: `Footwear "${footwear.name}" does not support outfit "${outfit.name}"`,
      severity: 'warning',
      suggestion: 'This combination may result in visual inconsistencies',
    });
  }

  return errors;
}

/**
 * Validates prop compatibility with pose
 */
export function validatePropPoseCompatibility(
  prop: PropDefinition,
  pose: PoseDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!prop.compatiblePoses.includes(pose.id)) {
    errors.push({
      field: 'prop',
      message: `Prop "${prop.name}" is not compatible with pose "${pose.name}"`,
      severity: 'error',
      suggestion: `Try one of these compatible poses: ${prop.compatiblePoses.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validates frame-specific requirements
 */
export function validateFrameRequirements(
  frame: FrameDefinition,
  params: ImageGenerationParams,
  availableProps: PropDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if required props are present
  for (const requiredPropId of frame.requiredProps) {
    if (!params.prop || params.prop !== requiredPropId) {
      const requiredProp = availableProps.find(p => p.id === requiredPropId);
      errors.push({
        field: 'prop',
        message: `Frame "${frame.name}" requires prop "${requiredProp?.name || requiredPropId}"`,
        severity: 'error',
        suggestion: `Add the required prop to generate this frame`,
      });
    }
  }

  // Validate frame category compatibility - only warn if frameType is explicitly set but inconsistent
  if (frame.id.startsWith('01') && params.frameType && params.frameType !== 'onboarding') {
    errors.push({
      field: 'frameType',
      message: 'Frame appears to be an onboarding frame but frameType is not set to "onboarding"',
      severity: 'warning',
      suggestion: 'Set frameType to "onboarding" for consistency',
    });
  }

  return errors;
}

/**
 * Comprehensive parameter validation
 */
export function validateParameters(
  params: ImageGenerationParams,
  availablePoses: PoseDefinition[],
  availableOutfits: OutfitDefinition[],
  availableFootwear: FootwearDefinition[],
  availableProps: PropDefinition[],
  availableFrames: FrameDefinition[]
): DetailedValidationResult {
  const allErrors: ValidationError[] = [];

  // Basic parameter validation
  allErrors.push(...validateBasicParameters(params));

  // Find definitions for selected parameters
  const selectedPose = availablePoses.find(p => p.id === params.pose);
  const selectedOutfit = availableOutfits.find(o => o.id === params.outfit);
  const selectedFootwear = availableFootwear.find((f: FootwearDefinition) => f.id === params.footwear);
  const selectedProp = params.prop ? availableProps.find(p => p.id === params.prop) : undefined;
  const selectedFrame = params.frameId ? availableFrames.find(f => f.id === params.frameId) : undefined;

  // Validate that selected items exist
  if (!selectedPose && params.pose) {
    allErrors.push({
      field: 'pose',
      message: `Pose "${params.pose}" not found`,
      severity: 'error',
      suggestion: 'Select a valid pose from available options',
    });
  }

  if (!selectedOutfit && params.outfit) {
    allErrors.push({
      field: 'outfit',
      message: `Outfit "${params.outfit}" not found`,
      severity: 'error',
      suggestion: 'Select a valid outfit from available options',
    });
  }

  if (!selectedFootwear && params.footwear) {
    allErrors.push({
      field: 'footwear',
      message: `Footwear "${params.footwear}" not found`,
      severity: 'error',
      suggestion: 'Select a valid footwear from available options',
    });
  }

  if (params.prop && !selectedProp) {
    allErrors.push({
      field: 'prop',
      message: `Prop "${params.prop}" not found`,
      severity: 'error',
      suggestion: 'Select a valid prop from available options',
    });
  }

  if (params.frameId && !selectedFrame) {
    allErrors.push({
      field: 'frameId',
      message: `Frame "${params.frameId}" not found`,
      severity: 'error',
      suggestion: 'Select a valid frame ID from available options',
    });
  }

  // Compatibility validations (only if items exist)
  if (selectedPose && selectedOutfit) {
    allErrors.push(...validatePoseOutfitCompatibility(selectedPose, selectedOutfit));
  }

  if (selectedOutfit && selectedFootwear) {
    allErrors.push(...validateOutfitFootwearCompatibility(selectedOutfit, selectedFootwear));
  }

  if (selectedProp && selectedPose) {
    allErrors.push(...validatePropPoseCompatibility(selectedProp, selectedPose));
  }

  if (selectedFrame) {
    allErrors.push(...validateFrameRequirements(selectedFrame, params, availableProps));
  }

  // Build compatibility information
  const compatibility: ParameterCompatibility = {
    poseId: params.pose,
    outfitId: params.outfit,
    footwearId: params.footwear,
    propId: params.prop,
    frameId: params.frameId,
    isCompatible: allErrors.filter(e => e.severity === 'error').length === 0,
    conflictReason: allErrors.find(e => e.severity === 'error')?.message,
  };

  // Generate alternative suggestions
  const alternativeOptions = generateAlternativeOptions(
    params,
    allErrors,
    availablePoses,
    availableOutfits,
    availableFootwear,
    availableProps
  );

  return {
    isValid: allErrors.filter(e => e.severity === 'error').length === 0,
    errors: allErrors,
    compatibility,
    suggestions: generateSuggestions(allErrors),
    alternativeOptions,
  };
}

/**
 * Generate alternative options based on validation errors
 */
function generateAlternativeOptions(
  params: ImageGenerationParams,
  errors: ValidationError[],
  availablePoses: PoseDefinition[],
  availableOutfits: OutfitDefinition[],
  availableFootwear: FootwearDefinition[],
  availableProps: PropDefinition[]
) {
  // Note: availableFootwear parameter is currently unused but kept for future enhancements
  void availableFootwear;
  const alternatives: any = {};

  const selectedPose = availablePoses.find(p => p.id === params.pose);
  const selectedOutfit = availableOutfits.find(o => o.id === params.outfit);

  // Suggest compatible outfits if pose-outfit compatibility fails
  if (selectedPose && errors.some(e => e.field === 'outfit' && e.severity === 'error')) {
    alternatives.outfits = selectedPose.compatibleOutfits;
  }

  // Suggest compatible footwear if outfit-footwear compatibility fails
  if (selectedOutfit && errors.some(e => e.field === 'footwear' && e.severity === 'error')) {
    alternatives.footwear = selectedOutfit.compatibleFootwear;
  }

  // Suggest compatible poses for props
  if (params.prop && errors.some(e => e.field === 'prop' && e.severity === 'error')) {
    const selectedProp = availableProps.find(p => p.id === params.prop);
    if (selectedProp) {
      alternatives.poses = selectedProp.compatiblePoses;
    }
  }

  // Suggest compatible props for poses (if no prop is selected but pose supports props)
  if (!params.prop && selectedPose) {
    const compatibleProps = availableProps.filter(prop => 
      prop.compatiblePoses.includes(selectedPose.id)
    );
    if (compatibleProps.length > 0) {
      alternatives.props = compatibleProps.map(p => p.id);
    }
  }

  return Object.keys(alternatives).length > 0 ? alternatives : undefined;
}

/**
 * Generate helpful suggestions based on validation errors
 */
function generateSuggestions(errors: ValidationError[]): string[] {
  const suggestions: string[] = [];

  if (errors.some(e => e.field === 'pose' && e.severity === 'error')) {
    suggestions.push('Start by selecting a pose, as it determines compatible outfits and props');
  }

  if (errors.some(e => e.field === 'outfit' && e.message.includes('not compatible'))) {
    suggestions.push('Choose an outfit that matches the selected pose for best visual results');
  }

  if (errors.some(e => e.field === 'footwear' && e.message.includes('not compatible'))) {
    suggestions.push('Select footwear that complements the chosen outfit style');
  }

  if (errors.some(e => e.field === 'prop' && e.message.includes('required'))) {
    suggestions.push('Some frames require specific props to maintain narrative consistency');
  }

  return suggestions;
}

/**
 * Validates brand consistency across parameter combinations
 */
export function validateBrandConsistency(
  pose: PoseDefinition,
  outfit: OutfitDefinition,
  footwear: FootwearDefinition,
  prop?: PropDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for style consistency between outfit and footwear
  const outfitStyle = getOutfitStyle(outfit);
  const footwearStyle = getFootwearStyle(footwear);

  if (outfitStyle && footwearStyle && !areStylesCompatible(outfitStyle, footwearStyle)) {
    errors.push({
      field: 'footwear',
      message: `Style mismatch: ${footwear.name} (${footwearStyle}) may not complement ${outfit.name} (${outfitStyle})`,
      severity: 'warning',
      suggestion: `Consider footwear that matches the ${outfitStyle} style`,
    });
  }

  // Check for pose-prop narrative consistency
  if (prop && pose.category === 'onboarding' && prop.category !== 'onboarding') {
    errors.push({
      field: 'prop',
      message: `Narrative inconsistency: onboarding pose with non-onboarding prop may break story flow`,
      severity: 'warning',
      suggestion: 'Use onboarding-specific props for narrative consistency',
    });
  }

  return errors;
}

/**
 * Validates technical rendering compatibility
 */
export function validateTechnicalCompatibility(
  params: ImageGenerationParams,
  frame?: FrameDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for complex rendering scenarios that might cause issues
  if (params.frameType === 'sequence' && !frame) {
    errors.push({
      field: 'frameId',
      message: 'Sequence frame type requires specific frame definition for proper rendering',
      severity: 'error',
      suggestion: 'Select a specific frame ID for sequence generation',
    });
  }

  // Validate prop-pose technical feasibility
  if (params.prop && params.pose) {
    const technicalIssues = checkPropPoseTechnicalIssues(params.prop, params.pose);
    if (technicalIssues.length > 0) {
      errors.push(...technicalIssues);
    }
  }

  return errors;
}

/**
 * Validates parameter combinations for optimal visual results
 */
export function validateVisualOptimization(
  pose: PoseDefinition,
  outfit: OutfitDefinition,
  footwear: FootwearDefinition,
  frame?: FrameDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for visual balance issues
  if (isVisuallyHeavyOutfit(outfit) && isVisuallyHeavyFootwear(footwear)) {
    errors.push({
      field: 'footwear',
      message: 'Visual balance concern: both outfit and footwear are visually prominent',
      severity: 'info',
      suggestion: 'Consider simpler footwear to balance the overall look',
    });
  }

  // Check for frame-specific visual requirements
  if (frame && frame.camera.includes('close-up') && pose.name.includes('Full Body')) {
    errors.push({
      field: 'pose',
      message: 'Camera-pose mismatch: close-up camera with full body pose may not render optimally',
      severity: 'warning',
      suggestion: 'Use upper body focused poses for close-up camera angles',
    });
  }

  return errors;
}

/**
 * Helper functions for style and compatibility checking
 */
function getOutfitStyle(outfit: OutfitDefinition): string | null {
  if (outfit.id.includes('hoodie') || outfit.id.includes('sweatpants')) return 'casual';
  if (outfit.id.includes('tshirt') || outfit.id.includes('shorts')) return 'active';
  if (outfit.id.includes('windbreaker')) return 'athletic';
  return null;
}

function getFootwearStyle(footwear: FootwearDefinition): string | null {
  if (footwear.brand === 'Nike' && footwear.model?.includes('Jordan')) return 'basketball';
  if (footwear.model?.includes('Air Max')) return 'retro';
  if (footwear.model?.includes('Ultraboost')) return 'modern';
  return null;
}

function areStylesCompatible(outfitStyle: string, footwearStyle: string): boolean {
  const compatibilityMatrix: Record<string, string[]> = {
    casual: ['basketball', 'retro', 'modern'],
    active: ['basketball', 'modern'],
    athletic: ['retro', 'modern'],
  };
  
  return compatibilityMatrix[outfitStyle]?.includes(footwearStyle) ?? true;
}

function checkPropPoseTechnicalIssues(propId: string, poseId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for hand positioning conflicts
  if (propId.includes('map') && poseId.includes('arms-crossed')) {
    errors.push({
      field: 'pose',
      message: 'Technical conflict: cannot hold map with arms crossed',
      severity: 'error',
      suggestion: 'Use a pose that allows for holding objects',
    });
  }

  return errors;
}

function isVisuallyHeavyOutfit(outfit: OutfitDefinition): boolean {
  return outfit.id.includes('hoodie') || outfit.id.includes('windbreaker');
}

function isVisuallyHeavyFootwear(footwear: FootwearDefinition): boolean {
  return footwear.model?.includes('Jordan') || footwear.id.includes('high-top');
}

/**
 * Enhanced comprehensive parameter validation with all validation layers
 */
export function validateParametersEnhanced(
  params: ImageGenerationParams,
  availablePoses: PoseDefinition[],
  availableOutfits: OutfitDefinition[],
  availableFootwear: FootwearDefinition[],
  availableProps: PropDefinition[],
  availableFrames: FrameDefinition[]
): DetailedValidationResult {
  // Start with basic validation
  const result = validateParameters(
    params,
    availablePoses,
    availableOutfits,
    availableFootwear,
    availableProps,
    availableFrames
  );

  // Get selected items for enhanced validation
  const selectedPose = availablePoses.find(p => p.id === params.pose);
  const selectedOutfit = availableOutfits.find(o => o.id === params.outfit);
  const selectedFootwear = availableFootwear.find((f: FootwearDefinition) => f.id === params.footwear);
  const selectedProp = params.prop ? availableProps.find(p => p.id === params.prop) : undefined;
  const selectedFrame = params.frameId ? availableFrames.find(f => f.id === params.frameId) : undefined;

  // Add enhanced validation layers if basic items exist
  if (selectedPose && selectedOutfit && selectedFootwear) {
    // Brand consistency validation
    const brandErrors = validateBrandConsistency(selectedPose, selectedOutfit, selectedFootwear, selectedProp);
    result.errors.push(...brandErrors);

    // Visual optimization validation
    const visualErrors = validateVisualOptimization(selectedPose, selectedOutfit, selectedFootwear, selectedFrame);
    result.errors.push(...visualErrors);
  }

  // Technical compatibility validation
  const technicalErrors = validateTechnicalCompatibility(params, selectedFrame);
  result.errors.push(...technicalErrors);

  // Update validity based on enhanced validation (only errors, not warnings or info)
  result.isValid = result.errors.filter(e => e.severity === 'error').length === 0;

  // Update compatibility information
  if (result.compatibility) {
    result.compatibility.isCompatible = result.isValid;
    result.compatibility.conflictReason = result.errors.find(e => e.severity === 'error')?.message;
  }

  return result;
}

/**
 * Simple validation function for backward compatibility
 */
export function validateParametersSimple(params: ImageGenerationParams): ValidationResult {
  const basicErrors = validateBasicParameters(params);
  
  return {
    isValid: basicErrors.filter(e => e.severity === 'error').length === 0,
    errors: basicErrors.map(e => e.message),
    warnings: basicErrors.filter(e => e.severity === 'warning').map(e => e.message),
    suggestions: basicErrors.filter(e => e.suggestion).map(e => e.suggestion!),
  };
}