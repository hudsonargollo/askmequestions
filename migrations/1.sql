
CREATE TABLE knowledge_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_module TEXT NOT NULL,
  functionality TEXT NOT NULL,
  description TEXT NOT NULL,
  ui_elements TEXT,
  user_questions_en TEXT,
  user_questions_pt TEXT,
  category TEXT NOT NULL,
  content_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
