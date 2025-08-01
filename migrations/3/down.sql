-- Capitão Caverna Image Engine - Migration 3 Rollback
-- Drop GeneratedImages and PromptCache tables

-- Drop indexes first
DROP INDEX IF EXISTS idx_prompt_cache_usage_count;
DROP INDEX IF EXISTS idx_prompt_cache_last_used;
DROP INDEX IF EXISTS idx_prompt_cache_created_at;
DROP INDEX IF EXISTS idx_generated_images_service;
DROP INDEX IF EXISTS idx_generated_images_created_at;
DROP INDEX IF EXISTS idx_generated_images_status;
DROP INDEX IF EXISTS idx_generated_images_user_id;

-- Drop tables
DROP TABLE IF EXISTS PromptCache;
DROP TABLE IF EXISTS GeneratedImages;