import z from "zod";

export const KnowledgeEntrySchema = z.object({
  id: z.number(),
  feature_module: z.string(),
  functionality: z.string(),
  description: z.string(),
  ui_elements: z.string().nullable(),
  user_questions_en: z.string().nullable(),
  user_questions_pt: z.string().nullable(),
  category: z.string(),
  content_text: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  language: z.enum(['en', 'pt']).optional().default('en'),
  category: z.string().optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResponseSchema = z.object({
  answer: z.string(),
  relevantEntries: z.array(KnowledgeEntrySchema),
  responseTime: z.number(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const FilterOptionsSchema = z.object({
  categories: z.array(z.string()),
});

export type FilterOptions = z.infer<typeof FilterOptionsSchema>;

// Capitão Caverna Image Engine Types
export const ImageGenerationParamsSchema = z.object({
  pose: z.string(),
  outfit: z.string(),
  footwear: z.string(),
  prop: z.string().optional(),
  frameType: z.enum(['standard', 'onboarding', 'sequence']).optional(),
  frameId: z.string().optional(), // For specific frames like "01A", "02B", etc.
});

export type ImageGenerationParams = z.infer<typeof ImageGenerationParamsSchema>;

export const GeneratedImageRecordSchema = z.object({
  image_id: z.string(),
  user_id: z.string(),
  r2_object_key: z.string(),
  prompt_parameters: z.string(), // JSON serialized ImageGenerationParams
  created_at: z.string(),
  status: z.enum(['PENDING', 'COMPLETE', 'FAILED']),
  error_message: z.string().nullable(),
  generation_time_ms: z.number().nullable(),
  service_used: z.enum(['midjourney', 'dalle', 'stable-diffusion']).nullable(),
  public_url: z.string().nullable(),
});

export type GeneratedImageRecord = z.infer<typeof GeneratedImageRecordSchema>;

export const PromptCacheRecordSchema = z.object({
  parameters_hash: z.string(),
  full_prompt: z.string(),
  created_at: z.string(),
  last_used: z.string(),
  usage_count: z.number(),
});

export type PromptCacheRecord = z.infer<typeof PromptCacheRecordSchema>;

export const ImageGenerationRequestSchema = z.object({
  params: ImageGenerationParamsSchema,
});

export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

export const ImageGenerationResponseSchema = z.object({
  success: z.boolean(),
  image_id: z.string().optional(),
  public_url: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETE', 'FAILED']),
  error: z.string().optional(),
});

export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;

// Prompt Template Engine Types
export const PoseDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['primary', 'onboarding', 'sequence']),
  compatibleOutfits: z.array(z.string()),
  promptFragment: z.string(),
});

export type PoseDefinition = z.infer<typeof PoseDefinitionSchema>;

export const OutfitDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  promptFragment: z.string(),
  compatibleFootwear: z.array(z.string()),
});

export type OutfitDefinition = z.infer<typeof OutfitDefinitionSchema>;

export const FootwearDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
  promptFragment: z.string(),
  compatibleOutfits: z.array(z.string()),
});

export type FootwearDefinition = z.infer<typeof FootwearDefinitionSchema>;

export const PropDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['onboarding', 'general', 'sequence']),
  promptFragment: z.string(),
  compatiblePoses: z.array(z.string()),
});

export type PropDefinition = z.infer<typeof PropDefinitionSchema>;

export const FrameDefinitionSchema = z.object({
  id: z.string(), // "01A", "02B", etc.
  name: z.string(),
  sequence: z.string(), // Which sequence this frame belongs to
  location: z.string(),
  positioning: z.string(),
  limbMetrics: z.string(),
  poseSpecifics: z.string(),
  facialExpression: z.string(),
  lighting: z.string(),
  camera: z.string(),
  environmentalTouches: z.string(),
  voiceover: z.string().optional(),
  requiredProps: z.array(z.string()),
  continuityNotes: z.string().optional(),
});

export type FrameDefinition = z.infer<typeof FrameDefinitionSchema>;

export const PromptFoundationSchema = z.object({
  environment: z.string(), // STANDARD CAVE ENVIRONMENT FOUNDATION
  character: z.string(),   // CAPITÃO CAVERNA — CHARACTER FOUNDATION
  technical: z.string(),   // TEXTURE / RESOLUTION BOOST
  brand: z.string(),       // BRAND ACCURACY — LOGO & COLORS
  safeguards: z.string(),  // BODY SAFEGUARDS + NEGATIVE PROMPTS
});

export type PromptFoundation = z.infer<typeof PromptFoundationSchema>;

export const PromptTemplateSchema = z.object({
  foundation: PromptFoundationSchema,
  variables: z.object({
    pose: PoseDefinitionSchema,
    outfit: OutfitDefinitionSchema,
    footwear: FootwearDefinitionSchema,
    prop: PropDefinitionSchema.optional(),
  }),
  frame: FrameDefinitionSchema.optional(),
  negativePrompt: z.string(),
  technicalSpecs: z.string(),
});

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

export const PromptOptionsSchema = z.object({
  poses: z.array(PoseDefinitionSchema),
  outfits: z.array(OutfitDefinitionSchema),
  footwear: z.array(FootwearDefinitionSchema),
  props: z.array(PropDefinitionSchema),
  frames: z.array(FrameDefinitionSchema),
});

export type PromptOptions = z.infer<typeof PromptOptionsSchema>;

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const GenerationResultSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().optional(),
  error: z.string().optional(),
  retryAfter: z.number().optional(),
});

export type GenerationResult = z.infer<typeof GenerationResultSchema>;

export const ServiceStatusSchema = z.object({
  available: z.boolean(),
  responseTime: z.number().optional(),
  lastChecked: z.string(),
  errorRate: z.number().optional(),
});

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

export const StorageResultSchema = z.object({
  success: z.boolean(),
  objectKey: z.string(),
  publicUrl: z.string(),
  error: z.string().optional(),
});

export type StorageResult = z.infer<typeof StorageResultSchema>;

export const ImageMetadataSchema = z.object({
  originalFilename: z.string().optional(),
  contentType: z.string(),
  size: z.number(),
  generationParams: ImageGenerationParamsSchema,
  createdAt: z.string(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

// Parameter Combination Validation Schemas
export const ParameterCompatibilitySchema = z.object({
  poseId: z.string(),
  outfitId: z.string(),
  footwearId: z.string(),
  propId: z.string().optional(),
  frameId: z.string().optional(),
  isCompatible: z.boolean(),
  conflictReason: z.string().optional(),
});

export type ParameterCompatibility = z.infer<typeof ParameterCompatibilitySchema>;

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  suggestion: z.string().optional(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// Enhanced validation result with detailed error information
export const DetailedValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  compatibility: ParameterCompatibilitySchema.optional(),
  suggestions: z.array(z.string()).optional(),
  alternativeOptions: z.object({
    poses: z.array(z.string()).optional(),
    outfits: z.array(z.string()).optional(),
    footwear: z.array(z.string()).optional(),
    props: z.array(z.string()).optional(),
  }).optional(),
});

export type DetailedValidationResult = z.infer<typeof DetailedValidationResultSchema>;
