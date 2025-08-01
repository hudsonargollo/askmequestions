-- Capitão Caverna Image Engine - Migration 3
-- GeneratedImages and PromptCache tables

-- Table for storing generated image metadata
CREATE TABLE IF NOT EXISTS GeneratedImages (
    image_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    r2_object_key TEXT NOT NULL UNIQUE,
    prompt_parameters TEXT NOT NULL, -- JSON with pose, outfit, footwear, prop, frameId
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETE', 'FAILED')) DEFAULT 'PENDING',
    error_message TEXT,
    generation_time_ms INTEGER,
    service_used TEXT CHECK (service_used IN ('midjourney', 'dalle', 'stable-diffusion')),
    public_url TEXT,
    
    -- Foreign key constraint (assuming Users table exists or will be created)
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Table for caching constructed prompts to improve performance
CREATE TABLE IF NOT EXISTS PromptCache (
    parameters_hash TEXT PRIMARY KEY,
    full_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 1
);

-- Indexes for GeneratedImages table performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON GeneratedImages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON GeneratedImages(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON GeneratedImages(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_service ON GeneratedImages(service_used);

-- Indexes for PromptCache table performance
CREATE INDEX IF NOT EXISTS idx_prompt_cache_created_at ON PromptCache(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_last_used ON PromptCache(last_used);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_usage_count ON PromptCache(usage_count);