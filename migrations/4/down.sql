-- Down migration 4: Drop Capitão Caverna Image Engine tables

-- Drop indexes first
DROP INDEX IF EXISTS idx_prompt_cache_usage_count;
DROP INDEX IF EXISTS idx_prompt_cache_last_used;
DROP INDEX IF EXISTS idx_generated_images_frame_type;
DROP INDEX IF EXISTS idx_generated_images_footwear;
DROP INDEX IF EXISTS idx_generated_images_outfit;
DROP INDEX IF EXISTS idx_generated_images_pose;
DROP INDEX IF EXISTS idx_generated_images_service_used;
DROP INDEX IF EXISTS idx_generated_images_created_at;
DROP INDEX IF EXISTS idx_generated_images_status;
DROP INDEX IF EXISTS idx_generated_images_user_id;

-- Drop tables
DROP TABLE IF EXISTS PromptCache;
DROP TABLE IF EXISTS GeneratedImages;