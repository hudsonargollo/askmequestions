import { PromptFoundation } from './types';

/**
 * CAPITAO CAVERNA ULTIMATE PROMPTS - Foundation Elements
 * Based on the structured matrix for consistent brand identity
 */

export const PROMPT_FOUNDATION: PromptFoundation = {
  environment: `
STANDARD CAVE ENVIRONMENT FOUNDATION:
Ultra-high-resolution, physically-based render of cathedral-scale granite & limestone architecture. 
STRUCTURAL SPECIFICATIONS: Massive stone pillars (8-12 feet diameter), natural archways with precise geological stratification, weathered surfaces showing millennia of water erosion patterns.
LIGHTING ARCHITECTURE: Warm amber crystal formations providing primary illumination (2700K-3000K color temperature), dramatic chiaroscuro with deep shadows and brilliant highlights, volumetric light rays penetrating through crystal clusters.
NATURAL ELEMENTS: Stalactites and stalagmites with realistic mineral deposits, underground pools reflecting crystal light, scattered precious gems embedded in rock faces, ancient cave paintings barely visible on distant walls.
TECHNICAL RENDERING: Subsurface scattering on crystal formations, realistic rock texture with bump mapping, atmospheric perspective with subtle mist, photorealistic material properties.
  `.trim(),

  character: `
CAPITÃO CAVERNA — CHARACTER FOUNDATION:
Confident gray and cream wolf with intense red eyes, standing upright in anthropomorphic form.
BODY-PROPORTION REINFORCEMENT: Athletic humanoid build, 6-foot height, broad shoulders tapering to defined waist, powerful stance with perfect posture.
FACIAL FEATURES: Sharp wolf muzzle with black nose, pointed ears alert and forward-facing, expressive red eyes with intelligent gleam, slight confident smile showing controlled strength.
FUR PATTERN: Primary gray coat with cream-colored chest, belly, and inner arms, natural fur texture with realistic lighting interaction, subtle muscle definition visible through fur.
HAND-COLOUR LOCK: Cream-colored hands and fingers with precise five-finger count, natural hand positioning, realistic proportions.
FINGER-COUNT ENFORCEMENT: Exactly five fingers per hand, anatomically correct thumb placement, natural finger positioning and spacing.
BRAND CONSISTENCY: Maintains character integrity across all poses and outfits, consistent proportions and coloring, recognizable silhouette.
  `.trim(),

  technical: `
TEXTURE / RESOLUTION BOOST:
Ultra-high-resolution rendering (4K minimum), photorealistic fur textures with individual hair strand definition, realistic fabric physics and material properties, advanced lighting with global illumination, subsurface scattering on organic materials, physically-based rendering (PBR) workflow, high dynamic range (HDR) lighting, anti-aliasing for crisp edges, detailed normal mapping for surface textures.
  `.trim(),

  brand: `
BRAND ACCURACY — LOGO & COLORS:
Consistent character design maintaining brand identity, accurate color palette (gray #808080, cream #F5F5DC, red eyes #DC143C), proper logo placement when applicable, brand-compliant styling, consistent character proportions across all variations, recognizable silhouette and features.
  `.trim(),

  safeguards: `
BODY SAFEGUARDS:
Anatomically correct proportions, exactly five fingers per hand, proper limb positioning, realistic joint articulation, consistent character scale, appropriate clothing fit, natural pose mechanics, correct facial feature placement, proper eye alignment, realistic muscle definition, appropriate fur pattern consistency.

NEGATIVE PROMPT (GLOBAL):
deformed hands, extra fingers, missing fingers, malformed limbs, disproportionate body parts, unrealistic anatomy, blurry features, low resolution, pixelated, artifacts, distorted proportions, incorrect number of limbs, floating objects, disconnected body parts, unnatural poses, inconsistent lighting, poor quality, amateur art, sketch-like appearance, unfinished rendering, color bleeding, oversaturation, undersaturation, incorrect brand colors, character inconsistency.
  `.trim(),
};

/**
 * Technical specifications for different rendering requirements
 */
export const TECHNICAL_SPECS = {
  standard: "Ultra-high-resolution, physically-based render, photorealistic quality, 4K resolution minimum",
  onboarding: "Cinematic quality rendering, dramatic lighting, narrative composition, enhanced detail for storytelling",
  sequence: "Consistent lighting and composition across frames, narrative continuity, smooth visual flow",
} as const;

/**
 * Negative prompt components for different scenarios
 */
export const NEGATIVE_PROMPTS = {
  global: PROMPT_FOUNDATION.safeguards,
  hands: "deformed hands, extra fingers, missing fingers, malformed hands, incorrect finger count, unnatural hand positioning",
  anatomy: "disproportionate body parts, unrealistic anatomy, malformed limbs, incorrect proportions, floating limbs",
  quality: "blurry, low resolution, pixelated, artifacts, poor quality, amateur art, sketch-like, unfinished",
  consistency: "character inconsistency, incorrect brand colors, wrong proportions, inconsistent features",
} as const;

/**
 * Frame-specific technical requirements
 */
export const FRAME_TECHNICAL_SPECS = {
  lighting: {
    dramatic: "Dramatic chiaroscuro lighting, strong contrast, volumetric light rays",
    ambient: "Soft ambient crystal lighting, even illumination, warm color temperature",
    focused: "Focused lighting on character, subtle background illumination, depth of field",
  },
  camera: {
    closeup: "Close-up shot, detailed facial features, shallow depth of field",
    medium: "Medium shot, full upper body visible, balanced composition",
    wide: "Wide shot, full character and environment visible, establishing shot",
    cinematic: "Cinematic composition, rule of thirds, dynamic framing",
  },
  environment: {
    minimal: "Simplified cave background, focus on character",
    detailed: "Fully detailed cave environment, rich atmospheric elements",
    narrative: "Environment supports story narrative, contextual elements visible",
  },
} as const;

/**
 * Continuity standards for frame sequences
 */
export const CONTINUITY_STANDARDS = {
  lighting: "Consistent lighting direction and intensity across sequence frames",
  character: "Maintain character proportions, coloring, and features throughout sequence",
  environment: "Consistent cave architecture and crystal placement across frames",
  props: "Maintain prop positioning, scale, and appearance throughout sequence",
  atmosphere: "Consistent atmospheric effects, mist, and ambient lighting",
} as const;