# Improved Search and Categorization System

## Enhanced Category Structure

### Primary Categories (Categorias Principais)

#### 1. Autenticação e Acesso (auth)
- `auth_login` - Login de usuário
- `auth_recovery` - Recuperação de senha
- `auth_registration` - Cadastro de nova conta
- `auth_sessions` - Gerenciamento de sessões

#### 2. Integração e Boas-vindas (onboarding)
- `onboarding_welcome` - Tela de boas-vindas
- `onboarding_ai_setup` - Configuração do assistente IA
- `onboarding_tour` - Tour guiado da interface
- `onboarding_quiz` - Quiz de personalidade
- `onboarding_next_steps` - Próximos passos

#### 3. Painel Principal (dashboard)
- `dashboard_main` - Central Caverna
- `dashboard_streak` - Contador de dias consecutivos
- `dashboard_widgets` - Widgets e métricas
- `dashboard_navigation` - Navegação principal

#### 4. Sistema de Rituais (rituals)
- `rituals_setup` - Calculadora de rituais
- `rituals_editing` - Edição de rituais
- `rituals_tracking` - Acompanhamento diário
- `rituals_library` - Biblioteca de atividades

#### 5. Desafios (challenges)
- `challenges_welcome` - Entrada no desafio
- `challenges_setup` - Configuração em 7 etapas
- `challenges_tracking` - Acompanhamento diário
- `challenges_community` - Desafios em grupo

#### 6. Agenda e Calendário (calendar)
- `calendar_main` - Visualização principal
- `calendar_events` - Criação de eventos
- `calendar_integration` - Integração Google Calendar
- `calendar_reminders` - Lembretes e notificações

#### 7. Comunidade (community)
- `community_feed` - Feed principal (Alcatéia)
- `community_posts` - Criação de posts
- `community_interaction` - Interações sociais
- `community_groups` - Grupos específicos

#### 8. Conhecimento (knowledge)
- `knowledge_library` - Biblioteca pessoal
- `knowledge_reading` - Gestão de leituras
- `knowledge_notes` - Sistema de anotações
- `knowledge_search` - Busca de conteúdo

#### 9. Cursos e Aprendizado (learning)
- `learning_courses` - Cursos disponíveis
- `learning_progress` - Progresso de aprendizado
- `learning_videos` - Player de vídeos
- `learning_certificates` - Certificados

#### 10. Perfil e Configurações (profile)
- `profile_account` - Informações da conta
- `profile_settings` - Configurações pessoais
- `profile_privacy` - Privacidade e segurança
- `profile_notifications` - Preferências de notificação

#### 11. Produtividade (productivity)
- `productivity_pomodoro` - Timer Pomodoro
- `productivity_tasks` - Quadro de tarefas
- `productivity_notes` - Anotações rápidas
- `productivity_flow` - Estado de fluxo

#### 12. Fitness e Saúde (fitness)
- `fitness_workouts` - Treinos e exercícios
- `fitness_nutrition` - Controle nutricional
- `fitness_tracking` - Acompanhamento físico
- `fitness_goals` - Metas de saúde

#### 13. Metas e Objetivos (goals)
- `goals_setting` - Definição de metas
- `goals_tracking` - Acompanhamento de progresso
- `goals_annual` - Metas anuais
- `goals_visualization` - Visualização de objetivos

#### 14. Manifestação (manifestation)
- `manifestation_vision` - Quadro de visão
- `manifestation_letters` - Cartas para o futuro
- `manifestation_techniques` - Técnicas de manifestação
- `manifestation_tracking` - Acompanhamento de manifestações

#### 15. Finanças (finances)
- `finances_dashboard` - Painel financeiro
- `finances_tracking` - Controle de gastos
- `finances_goals` - Metas financeiras
- `finances_reports` - Relatórios

#### 16. Indicação e Ganhos (referral)
- `referral_program` - Programa de indicação
- `referral_metrics` - Métricas de afiliação
- `referral_earnings` - Ganhos e comissões
- `referral_materials` - Materiais de divulgação

#### 17. Administração (admin)
- `admin_users` - Gestão de usuários
- `admin_content` - Gestão de conteúdo
- `admin_analytics` - Analytics e relatórios
- `admin_settings` - Configurações do sistema

## Advanced Search Features

### 1. Semantic Search Enhancement

#### Synonym Mapping (Mapeamento de Sinônimos)
```json
{
  "login": ["entrar", "acessar", "signin", "access", "authentication", "autenticação"],
  "challenge": ["desafio", "challenge", "40-day", "habit", "hábito", "transformação"],
  "ritual": ["routine", "rotina", "habit", "hábito", "manhã", "noite"],
  "agenda": ["calendar", "calendário", "schedule", "compromisso", "evento"],
  "community": ["comunidade", "feed", "social", "alcatéia", "wolves", "lobos"],
  "forge": ["fitness", "workout", "treino", "exercise", "exercício", "saúde"],
  "goals": ["metas", "objectives", "objetivos", "targets", "alvos"],
  "manifestation": ["manifestação", "lei da atração", "visualização", "sonhos"],
  "productivity": ["produtividade", "pomodoro", "tarefas", "foco", "flow"],
  "streak": ["sequência", "dias consecutivos", "consistência", "momentum"]
}
```

#### Contextual Search Terms
```json
{
  "getting_started": {
    "terms": ["começar", "iniciar", "primeiro", "novo", "setup", "configurar"],
    "categories": ["onboarding", "auth", "dashboard"]
  },
  "daily_use": {
    "terms": ["diário", "rotina", "check-in", "acompanhar", "tracking"],
    "categories": ["rituals", "challenges", "dashboard"]
  },
  "advanced_features": {
    "terms": ["avançado", "personalizar", "configurar", "otimizar"],
    "categories": ["admin", "productivity", "manifestation"]
  },
  "troubleshooting": {
    "terms": ["problema", "erro", "não funciona", "ajuda", "suporte"],
    "boost_troubleshooting": true
  }
}
```

### 2. Intent Recognition System

#### User Intent Categories
```json
{
  "how_to": {
    "patterns": ["como", "how", "tutorial", "passo a passo", "guia"],
    "response_type": "step_by_step_guide"
  },
  "what_is": {
    "patterns": ["o que é", "what is", "definição", "explicar"],
    "response_type": "concept_explanation"
  },
  "troubleshooting": {
    "patterns": ["não funciona", "erro", "problema", "bug", "falha"],
    "response_type": "troubleshooting_guide"
  },
  "where_find": {
    "patterns": ["onde", "where", "encontrar", "localizar", "acessar"],
    "response_type": "navigation_guide"
  }
}
```

### 3. Smart Filtering System

#### Dynamic Filters
```json
{
  "difficulty_level": {
    "basico": ["auth", "dashboard", "onboarding"],
    "intermediario": ["rituals", "challenges", "calendar"],
    "avancado": ["admin", "manifestation", "productivity"]
  },
  "user_journey_stage": {
    "novo_usuario": ["onboarding", "auth", "dashboard"],
    "usuario_ativo": ["rituals", "challenges", "community"],
    "usuario_avancado": ["productivity", "manifestation", "admin"]
  },
  "feature_type": {
    "core": ["auth", "dashboard", "profile"],
    "productivity": ["rituals", "challenges", "productivity"],
    "social": ["community", "referral"],
    "wellness": ["fitness", "goals", "manifestation"]
  }
}
```

### 4. Personalized Search

#### User Profile-Based Search
```json
{
  "user_preferences": {
    "primary_goals": ["fitness", "productivity", "spiritual"],
    "experience_level": ["beginner", "intermediate", "advanced"],
    "preferred_features": ["challenges", "rituals", "community"],
    "search_history": ["recent_queries", "clicked_results"]
  },
  "personalization_rules": {
    "boost_relevant_categories": 1.5,
    "prioritize_user_level": true,
    "suggest_related_features": true,
    "remember_successful_searches": true
  }
}
```

### 5. Search Result Enhancement

#### Rich Result Format
```json
{
  "search_result": {
    "title": "Como fazer login no Modo Caverna",
    "category": "Autenticação",
    "difficulty": "Básico",
    "estimated_time": "2 minutos",
    "prerequisites": ["Conta criada"],
    "quick_action": "E-mail → Senha → Acessar",
    "related_topics": ["Recuperar senha", "Criar conta"],
    "user_rating": 4.8,
    "last_updated": "2025-01-15"
  }
}
```

#### Answer Types
```json
{
  "answer_formats": {
    "quick_answer": "Resposta direta em 1-2 frases",
    "step_by_step": "Guia passo a passo numerado",
    "troubleshooting": "Lista de soluções ordenadas",
    "concept_explanation": "Explicação detalhada com contexto",
    "navigation_guide": "Caminho específico na interface"
  }
}
```

### 6. Search Analytics and Learning

#### Search Performance Metrics
```json
{
  "search_metrics": {
    "query_success_rate": "% de buscas que resultaram em clique",
    "user_satisfaction": "Rating médio das respostas",
    "common_failed_queries": "Buscas sem resultados satisfatórios",
    "popular_topics": "Tópicos mais buscados",
    "search_patterns": "Padrões de comportamento de busca"
  }
}
```

#### Continuous Improvement
```json
{
  "improvement_system": {
    "failed_query_analysis": "Identificar gaps na knowledge base",
    "synonym_expansion": "Adicionar novos sinônimos baseados em buscas",
    "content_optimization": "Melhorar conteúdo com baixo rating",
    "new_content_suggestions": "Sugerir novos tópicos baseados em demanda"
  }
}
```

## Implementation Strategy

### Phase 1: Core Search Enhancement
1. Implement new category structure
2. Add synonym mapping
3. Create intent recognition
4. Deploy basic filtering

### Phase 2: Personalization
1. User profile integration
2. Search history tracking
3. Personalized recommendations
4. Adaptive result ranking

### Phase 3: Advanced Features
1. Rich result formatting
2. Multi-modal search (text + voice)
3. Predictive search suggestions
4. Cross-reference linking

### Phase 4: Analytics and Optimization
1. Search analytics dashboard
2. A/B testing framework
3. Continuous learning system
4. Performance optimization

## Technical Implementation

### Database Schema Updates
```sql
-- Enhanced knowledge entries
ALTER TABLE knowledge_entries ADD COLUMN subcategory TEXT;
ALTER TABLE knowledge_entries ADD COLUMN difficulty_level TEXT;
ALTER TABLE knowledge_entries ADD COLUMN estimated_time INTEGER; -- in minutes
ALTER TABLE knowledge_entries ADD COLUMN prerequisites TEXT; -- JSON array
ALTER TABLE knowledge_entries ADD COLUMN quick_action TEXT;
ALTER TABLE knowledge_entries ADD COLUMN user_rating REAL DEFAULT 0;

-- Search analytics
CREATE TABLE search_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT,
  results_count INTEGER,
  clicked_result_id INTEGER,
  user_satisfied BOOLEAN,
  response_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User search preferences
CREATE TABLE user_search_preferences (
  user_id TEXT PRIMARY KEY,
  preferred_categories TEXT, -- JSON array
  difficulty_preference TEXT,
  search_history TEXT, -- JSON array of recent queries
  personalization_data TEXT, -- JSON object
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Enhancements
```typescript
// Enhanced search endpoint
app.post('/api/search/enhanced', async (c) => {
  const { query, user_id, filters, intent } = await c.req.json();
  
  // 1. Intent recognition
  const detectedIntent = recognizeIntent(query);
  
  // 2. Synonym expansion
  const expandedQuery = expandSynonyms(query);
  
  // 3. Personalized search
  const userPreferences = await getUserPreferences(user_id);
  
  // 4. Execute search with ranking
  const results = await searchWithRanking(expandedQuery, filters, userPreferences);
  
  // 5. Format results
  const formattedResults = formatResults(results, detectedIntent);
  
  // 6. Log analytics
  await logSearchAnalytics(query, user_id, results.length);
  
  return c.json({
    results: formattedResults,
    intent: detectedIntent,
    suggestions: generateSuggestions(query, results)
  });
});
```

This enhanced search system will transform the user experience from basic keyword matching to intelligent, personalized assistance that truly understands user needs and provides contextual, actionable guidance.

