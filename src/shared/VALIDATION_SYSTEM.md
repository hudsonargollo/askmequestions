# Parameter Validation and Compatibility Checking System

## Overview

This document describes the comprehensive parameter validation and compatibility checking system implemented for the Capitão Caverna Image Engine. The system ensures that all parameter combinations are valid, compatible, and will produce high-quality, consistent images.

## Validation Layers

### 1. Basic Parameter Validation (`validateBasicParameters`)

**Purpose**: Validates fundamental parameter requirements and structure.

**Checks**:
- Required fields (pose, outfit, footwear) are present and non-empty
- Frame-specific requirements (frameId required for onboarding/sequence frameTypes)
- Basic parameter structure integrity

**Error Types**: 
- `error`: Missing required fields
- `error`: Missing frameId for frame-dependent types

### 2. Compatibility Validation

#### Pose-Outfit Compatibility (`validatePoseOutfitCompatibility`)
**Purpose**: Ensures poses and outfits work together visually and technically.

**Logic**: Each pose defines `compatibleOutfits` array. Validation fails if selected outfit is not in this array.

**Example**: 
- `arms-crossed` pose is compatible with `hoodie-sweatpants` and `tshirt-shorts`
- `sitting-on-rock` pose may not work with formal outfits

#### Outfit-Footwear Compatibility (`validateOutfitFootwearCompatibility`)
**Purpose**: Ensures footwear complements the selected outfit style.

**Logic**: 
- Outfits define `compatibleFootwear` arrays
- Footwear defines `compatibleOutfits` arrays
- Bidirectional checking with different severity levels

**Error Types**:
- `error`: Outfit doesn't support the footwear
- `warning`: Footwear doesn't explicitly support the outfit (may still work)

#### Prop-Pose Compatibility (`validatePropPoseCompatibility`)
**Purpose**: Ensures props can be physically held/used with the selected pose.

**Logic**: Props define `compatiblePoses` arrays based on hand positioning and pose mechanics.

**Example**:
- `cave-map` prop requires poses that allow holding objects
- Cannot use `cave-map` with `arms-crossed` pose

### 3. Frame-Specific Validation (`validateFrameRequirements`)

**Purpose**: Validates frame-specific requirements for narrative sequences.

**Checks**:
- Required props for specific frames (e.g., frame "02B" requires "cave-map")
- Frame type consistency (onboarding frames should use frameType: 'onboarding')
- Narrative continuity requirements

### 4. Enhanced Validation Layers

#### Brand Consistency (`validateBrandConsistency`)
**Purpose**: Ensures visual and narrative consistency across parameter combinations.

**Checks**:
- Style compatibility between outfits and footwear
- Narrative consistency (onboarding poses with onboarding props)
- Brand identity maintenance

**Style Matrix**:
```
casual outfit + basketball footwear = ✓
active outfit + modern footwear = ✓
athletic outfit + retro footwear = ✓
```

#### Technical Compatibility (`validateTechnicalCompatibility`)
**Purpose**: Validates technical rendering feasibility.

**Checks**:
- Sequence frames require specific frame definitions
- Prop-pose technical conflicts (hand positioning, physics)
- Rendering complexity validation

#### Visual Optimization (`validateVisualOptimization`)
**Purpose**: Optimizes visual balance and composition.

**Checks**:
- Visual weight balance (heavy outfit + heavy footwear = warning)
- Camera-pose compatibility (close-up camera with full-body pose = warning)
- Composition optimization suggestions

## Validation Functions

### Core Functions

1. **`validateParameters`** - Comprehensive validation with detailed results
2. **`validateParametersEnhanced`** - All validation layers including brand, technical, and visual
3. **`validateParametersSimple`** - Backward-compatible simple validation

### Integration with Prompt Template Engine

The `PromptTemplateEngineImpl` class integrates validation:

```typescript
// Basic validation (backward compatible)
engine.validateParameters(params): ValidationResult

// Enhanced validation with all layers
engine.validateParametersDetailed(params): DetailedValidationResult

// Get compatible options based on current selection
engine.getCompatibleOptions(partialParams): Partial<PromptOptions>
```

## Error Handling and User Experience

### Error Severity Levels

- **`error`**: Blocks image generation, must be fixed
- **`warning`**: May affect quality, should be reviewed
- **`info`**: Optimization suggestions, optional

### Alternative Suggestions

The system provides intelligent alternatives when validation fails:

```typescript
{
  alternativeOptions: {
    outfits: ['hoodie-sweatpants', 'tshirt-shorts'], // Compatible with selected pose
    footwear: ['jordan-1', 'air-max-90'],           // Compatible with selected outfit
    poses: ['holding-map', 'pointing-forward'],      // Compatible with selected prop
    props: ['cave-map', 'crystal-orb']              // Compatible with selected pose
  }
}
```

### User-Friendly Messages

All validation errors include:
- Clear description of the problem
- Specific field that needs attention
- Actionable suggestion for resolution
- Alternative options when available

## Testing Coverage

### Unit Tests (31 tests)
- Basic parameter validation
- Individual compatibility functions
- Frame-specific requirements
- Enhanced validation layers
- Error message accuracy

### Integration Tests (15 tests)
- End-to-end validation through prompt engine
- Complex scenario validation
- Alternative suggestion generation
- Prompt building with validation
- Error handling edge cases

## Performance Considerations

### Validation Optimization
- Early exit on critical errors
- Cached compatibility matrices
- Efficient lookup structures (Maps vs Arrays)
- Minimal object creation during validation

### Memory Efficiency
- Reusable validation result objects
- Efficient error message generation
- Optimized compatibility checking algorithms

## Usage Examples

### Basic Usage
```typescript
const params = {
  pose: 'arms-crossed',
  outfit: 'hoodie-sweatpants',
  footwear: 'air-jordan-1-chicago'
};

const result = validateParameters(params, poses, outfits, footwear, props, frames);
if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Suggestions:', result.suggestions);
}
```

### Enhanced Usage
```typescript
const result = validateParametersEnhanced(params, poses, outfits, footwear, props, frames);

// Check all validation layers
const criticalErrors = result.errors.filter(e => e.severity === 'error');
const warnings = result.errors.filter(e => e.severity === 'warning');
const optimizations = result.errors.filter(e => e.severity === 'info');

// Get alternatives for failed validations
if (result.alternativeOptions) {
  console.log('Try these outfits instead:', result.alternativeOptions.outfits);
}
```

### Integration with UI
```typescript
const engine = new PromptTemplateEngineImpl();

// Validate as user makes selections
const validation = engine.validateParametersDetailed(currentParams);

// Show compatible options for next selection
const compatibleOptions = engine.getCompatibleOptions({ pose: selectedPose });
```

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**: Learn from successful combinations
2. **Dynamic Compatibility**: Update compatibility based on generation results
3. **Context-Aware Validation**: Consider user preferences and history
4. **Performance Metrics**: Track validation accuracy and user satisfaction

### Extensibility
The validation system is designed for easy extension:
- New validation layers can be added to `validateParametersEnhanced`
- Custom compatibility matrices can be loaded
- Validation rules can be configured per deployment
- New parameter types can be integrated seamlessly

## Requirements Compliance

This implementation satisfies all requirements from task 2.3:

✅ **Create validation logic for pose, outfit, footwear, and prop combinations**
- Comprehensive compatibility checking between all parameter types
- Bidirectional validation with appropriate error levels

✅ **Implement frame-specific parameter validation**
- Frame requirements validation (required props, type consistency)
- Narrative continuity checking

✅ **Add error handling for invalid parameter combinations**
- Multiple error severity levels (error, warning, info)
- Clear, actionable error messages with suggestions
- Alternative option generation

✅ **Write unit tests for validation logic**
- 46 comprehensive tests covering all validation scenarios
- Integration tests with prompt template engine
- Edge case and error handling coverage

The system provides robust, user-friendly validation that ensures high-quality image generation while maintaining the brand consistency and technical requirements of the Capitão Caverna character.