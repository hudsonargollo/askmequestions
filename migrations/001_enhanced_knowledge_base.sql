-- Migration 001: Enhanced Knowledge Base Schema
-- Add enhanced fields to knowledge_entries table for improved search and user experience

-- Add new columns to existing knowledge_entries table
ALTER TABLE knowledge_entries ADD COLUMN subcategory TEXT;
ALTER TABLE knowledge_entries ADD COLUMN difficulty_level TEXT DEFAULT 'basico';
ALTER TABLE knowledge_entries ADD COLUMN estimated_time INTEGER DEFAULT 5; -- minutes
ALTER TABLE knowledge_entries ADD COLUMN prerequisites TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN related_features TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN tags TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN use_cases TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN troubleshooting TEXT;
ALTER TABLE knowledge_entries ADD COLUMN quick_action TEXT;
ALTER TABLE knowledge_entries ADD COLUMN step_by_step_guide TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN real_world_examples TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN advanced_tips TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN ui_elements_pt TEXT; -- Portuguese UI strings
ALTER TABLE knowledge_entries ADD COLUMN philosophy_integration TEXT;
ALTER TABLE knowledge_entries ADD COLUMN user_rating REAL DEFAULT 0;
ALTER TABLE knowledge_entries ADD COLUMN popularity_score INTEGER DEFAULT 0;
ALTER TABLE knowledge_entries ADD COLUMN last_updated DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE knowledge_entries ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_subcategory ON knowledge_entries(subcategory);
CREATE INDEX IF NOT EXISTS idx_knowledge_difficulty ON knowledge_entries(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_entries(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_rating ON knowledge_entries(user_rating);
CREATE INDEX IF NOT EXISTS idx_knowledge_popularity ON knowledge_entries(popularity_score);

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  results_count INTEGER,
  clicked_result_id INTEGER,
  clicked_position INTEGER,
  user_satisfied BOOLEAN,
  response_time_ms INTEGER,
  search_type TEXT, -- 'semantic', 'keyword', 'filtered'
  filters_used TEXT, -- JSON object
  intent_detected TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clicked_result_id) REFERENCES knowledge_entries(id)
);

-- Create user feedback table
CREATE TABLE IF NOT EXISTS knowledge_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_entry_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  comment TEXT,
  feedback_type TEXT, -- 'rating', 'improvement', 'error'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_entry_id) REFERENCES knowledge_entries(id)
);

-- Create user search preferences table
CREATE TABLE IF NOT EXISTS user_search_preferences (
  user_id TEXT PRIMARY KEY,
  preferred_categories TEXT, -- JSON array
  difficulty_preference TEXT,
  language_preference TEXT DEFAULT 'pt',
  search_history TEXT, -- JSON array of recent queries
  personalization_data TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create synonym mapping table
CREATE TABLE IF NOT EXISTS search_synonyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  synonyms TEXT NOT NULL, -- JSON array
  category TEXT,
  language TEXT DEFAULT 'pt',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create intent patterns table
CREATE TABLE IF NOT EXISTS search_intent_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  intent_type TEXT NOT NULL, -- 'how_to', 'what_is', 'troubleshooting', 'where_find'
  response_template TEXT,
  confidence_score REAL DEFAULT 1.0,
  language TEXT DEFAULT 'pt',
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create failed queries tracking table
CREATE TABLE IF NOT EXISTS failed_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT,
  reason TEXT, -- 'no_results', 'poor_results', 'user_unsatisfied'
  suggested_content TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics tables
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_entry ON knowledge_feedback(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON knowledge_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON knowledge_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_synonyms_term ON search_synonyms(term);
CREATE INDEX IF NOT EXISTS idx_synonyms_category ON search_synonyms(category);
CREATE INDEX IF NOT EXISTS idx_intent_patterns_type ON search_intent_patterns(intent_type);

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  description TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT OR IGNORE INTO migrations (id, description) VALUES 
('001_enhanced_knowledge_base', 'Add enhanced fields and analytics tables for knowledge base');

