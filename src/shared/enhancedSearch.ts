// Enhanced Search System for Modo Caverna Knowledge Base
import OpenAI from 'openai';

export interface SearchRequest {
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

export interface SearchResult {
  id: number;
  title: string;
  content_text: string;
  category: string;
  subcategory: string;
  difficulty_level: string;
  estimated_time: number;
  quick_action: string;
  ui_elements_pt: string[];
  troubleshooting?: string;
  step_by_step_guide?: string[];
  philosophy_integration?: string;
  relevance_score: number;
  match_type: 'exact' | 'semantic' | 'synonym';
}

export interface EnhancedSearchResponse {
  results: SearchResult[];
  intent: string;
  suggestions: string[];
  total_results: number;
  response_time_ms: number;
}

// Portuguese synonym mapping for Modo Caverna terms
const SYNONYM_MAP: Record<string, string[]> = {
  'login': ['entrar', 'acessar', 'signin', 'access', 'autenticacao', 'autenticação'],
  'desafio': ['challenge', '40-dias', 'transformacao', 'transformação', 'jornada'],
  'ritual': ['rotina', 'habito', 'hábito', 'routine', 'manhã', 'noite'],
  'agenda': ['calendario', 'calendário', 'schedule', 'compromisso', 'evento'],
  'comunidade': ['feed', 'social', 'alcateia', 'alcatéia', 'lobos', 'wolves'],
  'forja': ['fitness', 'treino', 'workout', 'exercicio', 'exercício', 'saude', 'saúde'],
  'metas': ['objetivos', 'goals', 'targets', 'alvos', 'propositos', 'propósitos'],
  'manifestacao': ['manifestação', 'lei-da-atracao', 'lei-da-atração', 'visualizacao', 'visualização'],
  'produtividade': ['pomodoro', 'tarefas', 'foco', 'flow', 'concentracao', 'concentração'],
  'sequencia': ['sequência', 'streak', 'dias-consecutivos', 'consistencia', 'consistência']
};

// Intent recognition patterns for Portuguese
const INTENT_PATTERNS: Record<string, string[]> = {
  'how_to': ['como', 'how', 'tutorial', 'passo a passo', 'guia'],
  'what_is': ['o que é', 'what is', 'definição', 'explicar'],
  'troubleshooting': ['não funciona', 'erro', 'problema', 'bug', 'falha', 'not working', 'error', 'problem'],
  'where_find': ['onde', 'where', 'encontrar', 'localizar', 'acessar']
};

export class EnhancedSearchEngine {
  private db: D1Database;
  // @ts-ignore - Reserved for future semantic search implementation
  private openai: OpenAI;

  constructor(db: D1Database, openai: OpenAI) {
    this.db = db;
    this.openai = openai;
  }

  async search(request: SearchRequest): Promise<EnhancedSearchResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Intent Recognition
      const detectedIntent = this.recognizeIntent(request.query, request.language || 'pt');
      
      // 2. Synonym Expansion
      const expandedQuery = this.expandSynonyms(request.query);
      
      // 3. Get User Preferences
      const userPreferences = request.user_id 
        ? await this.getUserPreferences(request.user_id)
        : null;
      
      // 4. Perform Search
      const results = await this.performSearch(expandedQuery, request.filters, userPreferences);
      
      // 5. Generate Suggestions
      const suggestions = await this.generateSuggestions(request.query, results);
      
      // 6. Log Analytics
      await this.logSearchAnalytics({
        query: request.query,
        user_id: request.user_id,
        results_count: results.length,
        response_time_ms: Date.now() - startTime,
        intent_detected: detectedIntent,
        filters_used: request.filters
      });
      
      return {
        results: results.slice(0, 20), // Limit to top 20 results
        intent: detectedIntent,
        suggestions,
        total_results: results.length,
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('Enhanced search error:', error);
      
      // Fallback to basic search
      const basicResults = await this.basicSearch(request.query, request.filters);
      
      return {
        results: basicResults,
        intent: 'general',
        suggestions: [],
        total_results: basicResults.length,
        response_time_ms: Date.now() - startTime
      };
    }
  }

  private recognizeIntent(query: string, _language: string = 'pt'): string {
    const queryLower = query.toLowerCase();
    
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (queryLower.includes(pattern)) {
          return intent;
        }
      }
    }
    
    return 'general';
  }

  private expandSynonyms(query: string): string {
    let expandedQuery = query;
    const queryLower = query.toLowerCase();
    
    for (const [term, synonyms] of Object.entries(SYNONYM_MAP)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(queryLower)) {
        expandedQuery += ' ' + synonyms.join(' ');
      }
      
      // Also check if any synonym is in the query
      for (const synonym of synonyms) {
        const synonymRegex = new RegExp(`\\b${synonym}\\b`, 'gi');
        if (synonymRegex.test(queryLower)) {
          expandedQuery += ' ' + term + ' ' + synonyms.filter(s => s !== synonym).join(' ');
          break;
        }
      }
    }
    
    return expandedQuery;
  }

  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM user_search_preferences WHERE user_id = ?
      `).bind(userId).first();
      
      return result ? {
        preferred_categories: JSON.parse((result as any).preferred_categories || '[]'),
        difficulty_preference: (result as any).difficulty_preference,
        search_history: JSON.parse((result as any).search_history || '[]'),
        personalization_data: JSON.parse((result as any).personalization_data || '{}')
      } : null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  private async performSearch(
    query: string, 
    filters?: any, 
    userPreferences?: any
  ): Promise<SearchResult[]> {
    let sql = `
      SELECT * FROM knowledge_entries 
      WHERE is_active = true AND (
        content_text LIKE ? OR 
        user_questions_pt LIKE ? OR 
        user_questions_en LIKE ? OR
        tags LIKE ? OR
        troubleshooting LIKE ?
      )
    `;
    
    const searchTerm = `%${query}%`;
    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    
    // Apply filters
    if (filters?.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }
    
    if (filters?.difficulty) {
      sql += ` AND difficulty_level = ?`;
      params.push(filters.difficulty);
    }
    
    if (filters?.estimated_time) {
      sql += ` AND estimated_time <= ?`;
      params.push(filters.estimated_time);
    }
    
    // Apply user preferences for ranking
    if (userPreferences?.preferred_categories?.length > 0) {
      const categoryBoost = userPreferences.preferred_categories.map(() => 'category = ?').join(' OR ');
      sql += ` ORDER BY CASE WHEN ${categoryBoost} THEN 1 ELSE 2 END, popularity_score DESC, user_rating DESC`;
      params.push(...userPreferences.preferred_categories);
    } else {
      sql += ` ORDER BY popularity_score DESC, user_rating DESC`;
    }
    
    try {
      const results = await this.db.prepare(sql).bind(...params).all();
      
      return results.results.map((row: any) => ({
        id: row.id,
        title: `${row.feature_module} - ${row.functionality}`,
        content_text: row.content_text,
        category: row.category,
        subcategory: row.subcategory || row.category,
        difficulty_level: row.difficulty_level || 'basico',
        estimated_time: row.estimated_time || 5,
        quick_action: row.quick_action || 'Ver detalhes',
        ui_elements_pt: this.parseJsonSafely(row.ui_elements_pt, []),
        troubleshooting: row.troubleshooting,
        step_by_step_guide: this.parseJsonSafely(row.step_by_step_guide, []),
        philosophy_integration: row.philosophy_integration,
        relevance_score: this.calculateRelevanceScore(query, row),
        match_type: this.determineMatchType(query, row)
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async basicSearch(query: string, filters?: any): Promise<SearchResult[]> {
    let sql = `
      SELECT * FROM knowledge_entries 
      WHERE content_text LIKE ? OR user_questions_pt LIKE ?
    `;
    
    const searchTerm = `%${query}%`;
    const params = [searchTerm, searchTerm];
    
    if (filters?.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }
    
    sql += ` ORDER BY id LIMIT 10`;
    
    try {
      const results = await this.db.prepare(sql).bind(...params).all();
      
      return results.results.map((row: any) => ({
        id: row.id,
        title: `${row.feature_module} - ${row.functionality}`,
        content_text: row.content_text,
        category: row.category,
        subcategory: row.subcategory || row.category,
        difficulty_level: row.difficulty_level || 'basico',
        estimated_time: row.estimated_time || 5,
        quick_action: row.quick_action || 'Ver detalhes',
        ui_elements_pt: this.parseJsonSafely(row.ui_elements_pt, []),
        troubleshooting: row.troubleshooting,
        step_by_step_guide: this.parseJsonSafely(row.step_by_step_guide, []),
        philosophy_integration: row.philosophy_integration,
        relevance_score: 0.5,
        match_type: 'exact' as const
      }));
    } catch (error) {
      console.error('Basic search error:', error);
      return [];
    }
  }

  private parseJsonSafely(jsonString: string | null, defaultValue: any): any {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  private calculateRelevanceScore(query: string, row: any): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Exact matches in title/functionality
    if (row.functionality.toLowerCase().includes(queryLower)) score += 2.0;
    
    // Matches in content
    if (row.content_text.toLowerCase().includes(queryLower)) score += 1.0;
    
    // Matches in Portuguese questions
    if (row.user_questions_pt && row.user_questions_pt.toLowerCase().includes(queryLower)) score += 1.5;
    
    // User rating boost
    if (row.user_rating) score += row.user_rating * 0.1;
    
    // Popularity boost
    if (row.popularity_score) score += Math.log(row.popularity_score + 1) * 0.1;
    
    return Math.min(score, 5.0); // Cap at 5.0
  }

  private determineMatchType(query: string, row: any): 'exact' | 'semantic' | 'synonym' {
    const queryLower = query.toLowerCase();
    
    if (row.functionality.toLowerCase().includes(queryLower) || 
        row.content_text.toLowerCase().includes(queryLower)) {
      return 'exact';
    }
    
    // Check for synonym matches
    for (const synonyms of Object.values(SYNONYM_MAP)) {
      if (synonyms.some(synonym => queryLower.includes(synonym))) {
        return 'synonym';
      }
    }
    
    return 'semantic';
  }

  private async generateSuggestions(query: string, results: SearchResult[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Add related categories
    const categories = [...new Set(results.map(r => r.category))];
    if (categories.length > 0) {
      suggestions.push(...categories.slice(0, 3));
    }
    
    // Add common related terms
    const queryLower = query.toLowerCase();
    if (queryLower.includes('login') || queryLower.includes('entrar')) {
      suggestions.push('recuperar senha', 'criar conta', 'problemas de acesso');
    }
    
    if (queryLower.includes('desafio') || queryLower.includes('challenge')) {
      suggestions.push('configurar rituais', 'acompanhar progresso', 'comunidade');
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  private async logSearchAnalytics(data: {
    query: string;
    user_id?: string;
    results_count: number;
    response_time_ms: number;
    intent_detected: string;
    filters_used?: any;
  }): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO search_analytics 
        (query, user_id, results_count, response_time_ms, intent_detected, filters_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.query,
        data.user_id || null,
        data.results_count,
        data.response_time_ms,
        data.intent_detected,
        JSON.stringify(data.filters_used || {})
      ).run();
    } catch (error) {
      console.error('Error logging search analytics:', error);
    }
  }

  async submitFeedback(data: {
    knowledge_entry_id: number;
    user_id: string;
    rating?: number;
    helpful?: boolean;
    comment?: string;
    feedback_type?: string;
  }): Promise<void> {
    try {
      // Insert feedback
      await this.db.prepare(`
        INSERT INTO knowledge_feedback 
        (knowledge_entry_id, user_id, rating, helpful, comment, feedback_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.knowledge_entry_id,
        data.user_id,
        data.rating || null,
        data.helpful || null,
        data.comment || null,
        data.feedback_type || 'rating'
      ).run();
      
      // Update average rating if rating was provided
      if (data.rating) {
        const avgResult = await this.db.prepare(`
          SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
          FROM knowledge_feedback 
          WHERE knowledge_entry_id = ? AND rating IS NOT NULL
        `).bind(data.knowledge_entry_id).first();
        
        if (avgResult) {
          await this.db.prepare(`
            UPDATE knowledge_entries 
            SET user_rating = ?, popularity_score = popularity_score + 1
            WHERE id = ?
          `).bind((avgResult as any).avg_rating, data.knowledge_entry_id).run();
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }
}

