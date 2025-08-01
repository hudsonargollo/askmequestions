-- Migration 4: Create tables for Capitão Caverna Image Engine

-- Create GeneratedImages table
CREATE TABLE IF NOT EXISTS GeneratedImages (
    image_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    r2_object_key TEXT NOT NULL,
    prompt_parameters TEXT NOT NULL, -- JSON with pose, outfit, footwear, prop, frameId
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETE', 'FAILED')),
    error_message TEXT,
    generation_time_ms INTEGER,
    service_used TEXT, -- 'midjourney', 'dalle', 'stable-diffusion'
    public_url TEXT
);

-- Create PromptCache table for performance optimization
CREATE TABLE IF NOT EXISTS PromptCache (
    parameters_hash TEXT PRIMARY KEY,
    full_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON GeneratedImages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON GeneratedImages(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON GeneratedImages(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_service_used ON GeneratedImages(service_used);

-- Create indexes for JSON parameter queries
CREATE INDEX IF NOT EXISTS idx_generated_images_pose ON GeneratedImages(JSON_EXTRACT(prompt_parameters, '$.pose'));
CREATE INDEX IF NOT EXISTS idx_generated_images_outfit ON GeneratedImages(JSON_EXTRACT(prompt_parameters, '$.outfit'));
CREATE INDEX IF NOT EXISTS idx_generated_images_footwear ON GeneratedImages(JSON_EXTRACT(prompt_parameters, '$.footwear'));
CREATE INDEX IF NOT EXISTS idx_generated_images_frame_type ON GeneratedImages(JSON_EXTRACT(prompt_parameters, '$.frameType'));

-- Create indexes for PromptCache
CREATE INDEX IF NOT EXISTS idx_prompt_cache_last_used ON PromptCache(last_used);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_usage_count ON PromptCache(usage_count);