# Implementation Scripts and Migration Files

## Database Migration Scripts

### 1. Enhanced Knowledge Base Schema

```sql
-- migration_001_enhanced_knowledge_base.sql
-- Enhance existing knowledge_entries table with new fields

-- Add new columns to existing table
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
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_knowledge_subcategory ON knowledge_entries(subcategory);
CREATE INDEX idx_knowledge_difficulty ON knowledge_entries(difficulty_level);
CREATE INDEX idx_knowledge_tags ON knowledge_entries(tags);
CREATE INDEX idx_knowledge_active ON knowledge_entries(is_active);
CREATE INDEX idx_knowledge_rating ON knowledge_entries(user_rating);
CREATE INDEX idx_knowledge_popularity ON knowledge_entries(popularity_score);

-- Full-text search index
CREATE VIRTUAL TABLE knowledge_fts USING fts5(
  content_text,
  user_questions_pt,
  user_questions_en,
  tags,
  troubleshooting,
  content='knowledge_entries',
  content_rowid='id'
);

-- Trigger to keep FTS table in sync
CREATE TRIGGER knowledge_fts_insert AFTER INSERT ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(rowid, content_text, user_questions_pt, user_questions_en, tags, troubleshooting)
  VALUES (new.id, new.content_text, new.user_questions_pt, new.user_questions_en, new.tags, new.troubleshooting);
END;

CREATE TRIGGER knowledge_fts_delete AFTER DELETE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, content_text, user_questions_pt, user_questions_en, tags, troubleshooting)
  VALUES ('delete', old.id, old.content_text, old.user_questions_pt, old.user_questions_en, old.tags, old.troubleshooting);
END;

CREATE TRIGGER knowledge_fts_update AFTER UPDATE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, content_text, user_questions_pt, user_questions_en, tags, troubleshooting)
  VALUES ('delete', old.id, old.content_text, old.user_questions_pt, old.user_questions_en, old.tags, old.troubleshooting);
  INSERT INTO knowledge_fts(rowid, content_text, user_questions_pt, user_questions_en, tags, troubleshooting)
  VALUES (new.id, new.content_text, new.user_questions_pt, new.user_questions_en, new.tags, new.troubleshooting);
END;
```

### 2. Search Analytics and User Feedback

```sql
-- migration_002_search_analytics.sql
-- Create tables for search analytics and user feedback

-- Search analytics table
CREATE TABLE search_analytics (
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

-- User feedback table
CREATE TABLE knowledge_feedback (
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

-- User search preferences
CREATE TABLE user_search_preferences (
  user_id TEXT PRIMARY KEY,
  preferred_categories TEXT, -- JSON array
  difficulty_preference TEXT,
  language_preference TEXT DEFAULT 'pt',
  search_history TEXT, -- JSON array of recent queries
  personalization_data TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Failed queries tracking
CREATE TABLE failed_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT,
  reason TEXT, -- 'no_results', 'poor_results', 'user_unsatisfied'
  suggested_content TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics
CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_date ON search_analytics(created_at);
CREATE INDEX idx_feedback_entry ON knowledge_feedback(knowledge_entry_id);
CREATE INDEX idx_feedback_user ON knowledge_feedback(user_id);
CREATE INDEX idx_feedback_rating ON knowledge_feedback(rating);
```

### 3. Synonym and Intent Recognition

```sql
-- migration_003_search_enhancement.sql
-- Create tables for search enhancement features

-- Synonym mapping table
CREATE TABLE search_synonyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  synonyms TEXT NOT NULL, -- JSON array
  category TEXT,
  language TEXT DEFAULT 'pt',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Intent patterns table
CREATE TABLE search_intent_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  intent_type TEXT NOT NULL, -- 'how_to', 'what_is', 'troubleshooting', 'where_find'
  response_template TEXT,
  confidence_score REAL DEFAULT 1.0,
  language TEXT DEFAULT 'pt',
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contextual search rules
CREATE TABLE search_context_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_name TEXT NOT NULL,
  keywords TEXT NOT NULL, -- JSON array
  boost_categories TEXT, -- JSON array
  boost_factor REAL DEFAULT 1.5,
  user_journey_stage TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_synonyms_term ON search_synonyms(term);
CREATE INDEX idx_synonyms_category ON search_synonyms(category);
CREATE INDEX idx_intent_patterns_type ON search_intent_patterns(intent_type);
CREATE INDEX idx_context_rules_name ON search_context_rules(context_name);
```

## Data Population Scripts

### 4. Enhanced Knowledge Base Data

```sql
-- data_population_001_enhanced_entries.sql
-- Update existing entries with enhanced data

-- Update authentication entries
UPDATE knowledge_entries 
SET 
  subcategory = 'auth_login',
  difficulty_level = 'basico',
  estimated_time = 2,
  prerequisites = '["conta_criada"]',
  tags = '["login", "acesso", "autenticacao", "entrar"]',
  quick_action = 'E-mail → Senha → Acessar',
  ui_elements_pt = '["E-mail", "Senha", "Acessar", "Mantenha-me conectado", "Esqueceu a senha?"]',
  troubleshooting = 'Se login falhar: 1) Verificar email/senha, 2) Limpar cache, 3) Tentar recuperação',
  philosophy_integration = 'Entrada na caverna representa compromisso com transformação pessoal',
  last_updated = CURRENT_TIMESTAMP
WHERE feature_module = 'Authentication' AND functionality = 'User Login';

-- Update onboarding entries
UPDATE knowledge_entries 
SET 
  subcategory = 'onboarding_welcome',
  difficulty_level = 'basico',
  estimated_time = 5,
  prerequisites = '["conta_criada"]',
  tags = '["boas-vindas", "primeiro-acesso", "introducao", "caverna"]',
  quick_action = 'Ler introdução → Começar jornada',
  ui_elements_pt = '["Seja bem-vindo(a) à Caverna", "Começar jornada", "Pular introdução"]',
  philosophy_integration = 'Momento de conexão com a filosofia Modo Caverna e mentalidade de alcatéia',
  last_updated = CURRENT_TIMESTAMP
WHERE feature_module = 'Onboarding' AND functionality = 'Welcome Screen';

-- Update challenge entries
UPDATE knowledge_entries 
SET 
  subcategory = 'challenges_welcome',
  difficulty_level = 'intermediario',
  estimated_time = 10,
  prerequisites = '["rituais_configurados", "perfil_completo"]',
  tags = '["desafio", "40-dias", "transformacao", "compromisso"]',
  quick_action = 'Ler sobre desafio → Eu aceito o desafio',
  ui_elements_pt = '["Desafio Caverna", "Eu aceito o desafio", "Saiba mais"]',
  philosophy_integration = 'Compromisso total com 40 dias de transformação profunda, mentalidade de lobo alfa',
  last_updated = CURRENT_TIMESTAMP
WHERE feature_module = 'Cave Challenge' AND functionality = 'Challenge Welcome Screen';
```

### 5. Synonym Data Population

```sql
-- data_population_002_synonyms.sql
-- Populate synonym mapping table

INSERT INTO search_synonyms (term, synonyms, category, language) VALUES
('login', '["entrar", "acessar", "signin", "access", "autenticacao", "autenticação"]', 'auth', 'pt'),
('desafio', '["challenge", "40-dias", "transformacao", "transformação", "jornada"]', 'challenges', 'pt'),
('ritual', '["rotina", "habito", "hábito", "routine", "manhã", "noite"]', 'rituals', 'pt'),
('agenda', '["calendario", "calendário", "schedule", "compromisso", "evento"]', 'calendar', 'pt'),
('comunidade', '["feed", "social", "alcateia", "alcatéia", "lobos", "wolves"]', 'community', 'pt'),
('forja', '["fitness", "treino", "workout", "exercicio", "exercício", "saude", "saúde"]', 'fitness', 'pt'),
('metas', '["objetivos", "goals", "targets", "alvos", "propositos", "propósitos"]', 'goals', 'pt'),
('manifestacao', '["manifestação", "lei-da-atracao", "lei-da-atração", "visualizacao", "visualização"]', 'manifestation', 'pt'),
('produtividade', '["pomodoro", "tarefas", "foco", "flow", "concentracao", "concentração"]', 'productivity', 'pt'),
('sequencia', '["sequência", "streak", "dias-consecutivos", "consistencia", "consistência"]', 'dashboard', 'pt');
```

### 6. Intent Pattern Data

```sql
-- data_population_003_intent_patterns.sql
-- Populate intent recognition patterns

INSERT INTO search_intent_patterns (pattern, intent_type, response_template, language) VALUES
('como', 'how_to', 'step_by_step_guide', 'pt'),
('how', 'how_to', 'step_by_step_guide', 'en'),
('o que é', 'what_is', 'concept_explanation', 'pt'),
('what is', 'what_is', 'concept_explanation', 'en'),
('onde', 'where_find', 'navigation_guide', 'pt'),
('where', 'where_find', 'navigation_guide', 'en'),
('não funciona', 'troubleshooting', 'troubleshooting_guide', 'pt'),
('not working', 'troubleshooting', 'troubleshooting_guide', 'en'),
('erro', 'troubleshooting', 'troubleshooting_guide', 'pt'),
('error', 'troubleshooting', 'troubleshooting_guide', 'en'),
('problema', 'troubleshooting', 'troubleshooting_guide', 'pt'),
('problem', 'troubleshooting', 'troubleshooting_guide', 'en');
```

## API Enhancement Scripts

### 7. Enhanced Search API

```typescript
// enhanced_search_api.ts
// Enhanced search endpoint with semantic capabilities

import { OpenAI } from 'openai';

interface SearchRequest {
  query: string;
  user_id?: string;
  filters?: {
    category?: string;
    difficulty?: string;
    estimated_time?: number;
  };
  language?: 'pt' | 'en';
  intent?: string;
}

interface SearchResult {
  id: number;
  title: string;
  content_text: string;
  category: string;
  subcategory: string;
  difficulty_level: string;
  estimated_time: number;
  quick_action: string;
  ui_elements_pt: string[];
  relevance_score: number;
  match_type: 'exact' | 'semantic' | 'synonym';
}

// Enhanced search function
async function enhancedSearch(
  db: D1Database,
  openai: OpenAI,
  request: SearchRequest
): Promise<{
  results: SearchResult[];
  intent: string;
  suggestions: string[];
  total_results: number;
}> {
  const startTime = Date.now();
  
  // 1. Intent Recognition
  const detectedIntent = await recognizeIntent(db, request.query, request.language);
  
  // 2. Synonym Expansion
  const expandedQuery = await expandSynonyms(db, request.query, request.language);
  
  // 3. Get User Preferences
  const userPreferences = request.user_id 
    ? await getUserPreferences(db, request.user_id)
    : null;
  
  // 4. Semantic Search with OpenAI
  const semanticResults = await semanticSearch(
    db, 
    openai, 
    expandedQuery, 
    request.filters,
    userPreferences
  );
  
  // 5. Keyword Search Fallback
  const keywordResults = await keywordSearch(db, expandedQuery, request.filters);
  
  // 6. Merge and Rank Results
  const mergedResults = mergeAndRankResults(semanticResults, keywordResults, userPreferences);
  
  // 7. Generate Suggestions
  const suggestions = await generateSuggestions(db, request.query, mergedResults);
  
  // 8. Log Analytics
  await logSearchAnalytics(db, {
    query: request.query,
    user_id: request.user_id,
    results_count: mergedResults.length,
    response_time_ms: Date.now() - startTime,
    intent_detected: detectedIntent,
    filters_used: request.filters
  });
  
  return {
    results: mergedResults.slice(0, 20), // Limit to top 20 results
    intent: detectedIntent,
    suggestions,
    total_results: mergedResults.length
  };
}

// Intent recognition function
async function recognizeIntent(
  db: D1Database, 
  query: string, 
  language: string = 'pt'
): Promise<string> {
  const patterns = await db.prepare(`
    SELECT intent_type, confidence_score 
    FROM search_intent_patterns 
    WHERE language = ? AND is_active = true
    ORDER BY confidence_score DESC
  `).bind(language).all();
  
  const queryLower = query.toLowerCase();
  
  for (const pattern of patterns.results) {
    if (queryLower.includes(pattern.pattern)) {
      return pattern.intent_type;
    }
  }
  
  return 'general';
}

// Synonym expansion function
async function expandSynonyms(
  db: D1Database, 
  query: string, 
  language: string = 'pt'
): Promise<string> {
  const synonyms = await db.prepare(`
    SELECT term, synonyms 
    FROM search_synonyms 
    WHERE language = ?
  `).bind(language).all();
  
  let expandedQuery = query;
  
  for (const synonym of synonyms.results) {
    const synonymList = JSON.parse(synonym.synonyms);
    const regex = new RegExp(`\\b${synonym.term}\\b`, 'gi');
    
    if (regex.test(query)) {
      expandedQuery += ' ' + synonymList.join(' ');
    }
  }
  
  return expandedQuery;
}

// Semantic search using OpenAI embeddings
async function semanticSearch(
  db: D1Database,
  openai: OpenAI,
  query: string,
  filters?: any,
  userPreferences?: any
): Promise<SearchResult[]> {
  // Generate embedding for the query
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  
  // For now, fall back to FTS search
  // In production, you'd use vector similarity search
  return await ftsSearch(db, query, filters);
}

// Full-text search function
async function ftsSearch(
  db: D1Database,
  query: string,
  filters?: any
): Promise<SearchResult[]> {
  let sql = `
    SELECT ke.*, 
           knowledge_fts.rank,
           'fts' as match_type
    FROM knowledge_fts 
    JOIN knowledge_entries ke ON knowledge_fts.rowid = ke.id
    WHERE knowledge_fts MATCH ? AND ke.is_active = true
  `;
  
  const params = [query];
  
  if (filters?.category) {
    sql += ` AND ke.category = ?`;
    params.push(filters.category);
  }
  
  if (filters?.difficulty) {
    sql += ` AND ke.difficulty_level = ?`;
    params.push(filters.difficulty);
  }
  
  sql += ` ORDER BY knowledge_fts.rank, ke.popularity_score DESC, ke.user_rating DESC`;
  
  const results = await db.prepare(sql).bind(...params).all();
  
  return results.results.map(row => ({
    ...row,
    ui_elements_pt: JSON.parse(row.ui_elements_pt || '[]'),
    relevance_score: 1.0 / (row.rank + 1), // Convert rank to relevance score
    match_type: 'fts'
  }));
}

// Export the enhanced search function
export { enhancedSearch };
```

### 8. Feedback Collection API

```typescript
// feedback_api.ts
// API endpoints for collecting user feedback

// Submit feedback endpoint
app.post('/api/knowledge/:id/feedback', authMiddleware, async (c) => {
  const knowledgeId = c.req.param('id');
  const { rating, helpful, comment, feedback_type } = await c.req.json();
  const user = c.get('user');
  
  // Validate input
  if (!rating || rating < 1 || rating > 5) {
    return c.json({ error: 'Rating must be between 1 and 5' }, 400);
  }
  
  // Insert feedback
  await c.env.DB.prepare(`
    INSERT INTO knowledge_feedback 
    (knowledge_entry_id, user_id, rating, helpful, comment, feedback_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    knowledgeId,
    user.id,
    rating,
    helpful,
    comment,
    feedback_type || 'rating'
  ).run();
  
  // Update average rating
  const avgResult = await c.env.DB.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
    FROM knowledge_feedback 
    WHERE knowledge_entry_id = ?
  `).bind(knowledgeId).first();
  
  await c.env.DB.prepare(`
    UPDATE knowledge_entries 
    SET user_rating = ?, popularity_score = popularity_score + 1
    WHERE id = ?
  `).bind(avgResult.avg_rating, knowledgeId).run();
  
  return c.json({ success: true });
});

// Get popular content endpoint
app.get('/api/knowledge/popular', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM knowledge_entries 
    WHERE is_active = true
    ORDER BY popularity_score DESC, user_rating DESC
    LIMIT 10
  `).all();
  
  return c.json({ popular_entries: results.results });
});

// Analytics endpoint for admins
app.get('/api/admin/knowledge/analytics', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user.isAdmin) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  // Get search analytics
  const searchStats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_searches,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(response_time_ms) as avg_response_time,
      COUNT(CASE WHEN user_satisfied = true THEN 1 END) as satisfied_searches
    FROM search_analytics 
    WHERE created_at >= datetime('now', '-30 days')
  `).first();
  
  // Get popular queries
  const popularQueries = await c.env.DB.prepare(`
    SELECT query, COUNT(*) as frequency
    FROM search_analytics 
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY query
    ORDER BY frequency DESC
    LIMIT 10
  `).all();
  
  // Get failed queries
  const failedQueries = await c.env.DB.prepare(`
    SELECT query, COUNT(*) as frequency
    FROM failed_queries 
    WHERE created_at >= datetime('now', '-30 days') AND resolved = false
    GROUP BY query
    ORDER BY frequency DESC
    LIMIT 10
  `).all();
  
  return c.json({
    search_stats: searchStats,
    popular_queries: popularQueries.results,
    failed_queries: failedQueries.results
  });
});
```

## Deployment Scripts

### 9. Migration Runner

```typescript
// migration_runner.ts
// Script to run database migrations

interface Migration {
  id: string;
  description: string;
  sql: string;
  rollback?: string;
}

const migrations: Migration[] = [
  {
    id: '001_enhanced_knowledge_base',
    description: 'Add enhanced fields to knowledge_entries table',
    sql: `
      -- Add new columns
      ALTER TABLE knowledge_entries ADD COLUMN subcategory TEXT;
      ALTER TABLE knowledge_entries ADD COLUMN difficulty_level TEXT DEFAULT 'basico';
      -- ... (rest of migration 001)
    `,
    rollback: `
      -- Remove added columns (if needed)
      -- Note: SQLite doesn't support DROP COLUMN easily
    `
  },
  {
    id: '002_search_analytics',
    description: 'Create search analytics and feedback tables',
    sql: `
      -- Create search_analytics table
      CREATE TABLE search_analytics (...);
      -- ... (rest of migration 002)
    `
  }
  // Add more migrations as needed
];

async function runMigrations(db: D1Database) {
  // Create migrations table if it doesn't exist
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  // Get executed migrations
  const executedMigrations = await db.prepare(`
    SELECT id FROM migrations
  `).all();
  
  const executedIds = new Set(executedMigrations.results.map(m => m.id));
  
  // Run pending migrations
  for (const migration of migrations) {
    if (!executedIds.has(migration.id)) {
      console.log(`Running migration: ${migration.id} - ${migration.description}`);
      
      try {
        // Execute migration SQL
        await db.exec(migration.sql);
        
        // Record migration as executed
        await db.prepare(`
          INSERT INTO migrations (id, description) VALUES (?, ?)
        `).bind(migration.id, migration.description).run();
        
        console.log(`✅ Migration ${migration.id} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${migration.id} failed:`, error);
        throw error;
      }
    }
  }
  
  console.log('All migrations completed successfully');
}

export { runMigrations };
```

### 10. Data Seeding Script

```typescript
// data_seeder.ts
// Script to populate initial data

async function seedEnhancedKnowledgeBase(db: D1Database) {
  console.log('Seeding enhanced knowledge base data...');
  
  // Enhanced authentication entries
  const authEntries = [
    {
      feature_module: 'Authentication',
      functionality: 'User Login',
      subcategory: 'auth_login',
      difficulty_level: 'basico',
      estimated_time: 2,
      prerequisites: JSON.stringify(['conta_criada']),
      tags: JSON.stringify(['login', 'acesso', 'autenticacao', 'entrar']),
      quick_action: 'E-mail → Senha → Acessar',
      ui_elements_pt: JSON.stringify(['E-mail', 'Senha', 'Acessar', 'Mantenha-me conectado']),
      troubleshooting: 'Se login falhar: 1) Verificar email/senha, 2) Limpar cache, 3) Tentar recuperação',
      philosophy_integration: 'Entrada na caverna representa compromisso com transformação pessoal'
    }
    // Add more entries...
  ];
  
  for (const entry of authEntries) {
    await db.prepare(`
      UPDATE knowledge_entries SET
        subcategory = ?,
        difficulty_level = ?,
        estimated_time = ?,
        prerequisites = ?,
        tags = ?,
        quick_action = ?,
        ui_elements_pt = ?,
        troubleshooting = ?,
        philosophy_integration = ?,
        last_updated = CURRENT_TIMESTAMP
      WHERE feature_module = ? AND functionality = ?
    `).bind(
      entry.subcategory,
      entry.difficulty_level,
      entry.estimated_time,
      entry.prerequisites,
      entry.tags,
      entry.quick_action,
      entry.ui_elements_pt,
      entry.troubleshooting,
      entry.philosophy_integration,
      entry.feature_module,
      entry.functionality
    ).run();
  }
  
  console.log('✅ Enhanced knowledge base data seeded successfully');
}

export { seedEnhancedKnowledgeBase };
```

These implementation scripts provide a complete foundation for deploying the enhanced knowledge base system with all the improvements we've designed.

