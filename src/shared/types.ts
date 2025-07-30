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
