-- Knowledge entries table
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_module TEXT NOT NULL,
  functionality TEXT NOT NULL,
  description TEXT,
  ui_elements TEXT,
  user_questions_en TEXT,
  user_questions_pt TEXT,
  category TEXT NOT NULL,
  content_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Search sessions table for analytics
CREATE TABLE IF NOT EXISTS search_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  response TEXT,
  response_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  minio_key TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Capitão Caverna Image Engine tables
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
    public_url TEXT
);

-- Table for caching constructed prompts to improve performance
CREATE TABLE IF NOT EXISTS PromptCache (
    parameters_hash TEXT PRIMARY KEY,
    full_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 1
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_content ON knowledge_entries(content_text);
CREATE INDEX IF NOT EXISTS idx_search_created ON search_sessions(created_at);

-- Indexes for GeneratedImages table performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON GeneratedImages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON GeneratedImages(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON GeneratedImages(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_service ON GeneratedImages(service_used);

-- Indexes for PromptCache table performance
CREATE INDEX IF NOT EXISTS idx_prompt_cache_created_at ON PromptCache(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_last_used ON PromptCache(last_used);
CREATE INDEX IF NOT EXISTS idx_prompt_cache_usage_count ON PromptCache(usage_count);