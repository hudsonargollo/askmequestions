export interface CorrectedKnowledgeEntry {
  feature_module: string;
  functionality: string;
  description: string;
  subcategory: string;
  difficulty_level: 'basico' | 'intermediario' | 'avancado';
  estimated_time: number;
  prerequisites: string[];
  related_features: string[];
  tags: string[];
  use_cases: string[];
  ui_elements: string;
  ui_elements_pt: string[];
  user_questions_en: string;
  user_questions_pt: string[];
  category: string;
  content_text: string;
  quick_action: string;
  step_by_step_guide: string[];
  real_world_examples: string[];
  troubleshooting: string;
  advanced_tips: string[];
  philosophy_integration: string;
  modo_caverna_level: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Official levels
  level_name: 'O Despertar' | 'A Ruptura' | 'O Chamado' | 'A Descoberta' | 'O Discernimento' | 'A Ascensão' | 'A Lenda';
  state_of_mind: 'Inconformado' | 'Explorador' | 'Guerreiro' | 'Estrategista' | 'Sábio' | 'Mestre' | 'Lenda';
}

export const CORRECTED_MODO_CAVERNA_KNOWLEDGE: CorrectedKnowledgeEntry[] = [
  // 1. Flow Produtividade - Core transformation tool
  {
    feature_module: "Flow Produtividade",
    functionality: "Sistema completo de foco e produtividade",
    description: "Ferramenta principal para ativar o estado de flow e maximizar a produtividade através do foco absoluto",
    subcategory: "flow_state",
    difficulty_level: "intermediario",
    estimated_time: 45,
    prerequisites: ["onboarding_completo", "rituais_configurados"],
    related_features: ["pomodoro", "kanban", "playlists", "checklist_flow"],
    tags: ["flow", "foco", "produtividade", "pomodoro", "kanban", "concentracao"],
    use_cases: [
      "Sessão de trabalho profundo de 2-4 horas",
      "Estudo intensivo para provas ou certificações",
      "Desenvolvimento de projetos pessoais importantes",
      "Escrita de relatórios ou documentos complexos"
    ],
    ui_elements: "Checklist de Ativação do FLOW, Timer Pomodoro, Quadro Kanban, Player de Playlists",
    ui_elements_pt: ["Checklist de Ativação", "Timer Pomodoro", "Quadro Kanban", "Player de Música", "Contador de Minutos"],
    user_questions_en: "How to activate flow state? How to use pomodoro? How to manage tasks?",
    user_questions_pt: [
      "Como ativar o estado de flow?",
      "Como usar o pomodoro?",
      "Como gerenciar tarefas no Kanban?",
      "Qual playlist usar para focar?",
      "Como registrar minutos de foco?"
    ],
    category: "Produtividade",
    content_text: "O Flow Produtividade é o coração do sistema Modo Caverna, implementando a filosofia PROPÓSITO > FOCO > PROGRESSO. Inclui: Checklist de Ativação do FLOW para preparar sua mente, Pomodoro com registro preciso de minutos em foco, sistema Kanban para gerenciamento visual de tarefas, e playlists especializadas para estudar, trabalhar e focar. Esta ferramenta elimina distrações e direciona toda energia para o que realmente importa.",
    quick_action: "Ativar checklist de flow e iniciar sessão Pomodoro",
    step_by_step_guide: [
      "1. Abra o Flow Produtividade no menu principal",
      "2. Complete o Checklist de Ativação do FLOW (eliminar distrações, definir objetivo, preparar ambiente)",
      "3. Selecione a playlist adequada para sua atividade",
      "4. Configure o timer Pomodoro (25 min trabalho + 5 min pausa)",
      "5. Mova tarefas no Kanban conforme progresso",
      "6. Registre minutos de foco ao final da sessão"
    ],
    real_world_examples: [
      "Desenvolvedor usando Flow para 4h de programação ininterrupta",
      "Estudante preparando TCC com sessões de 2h diárias",
      "Empreendedor criando plano de negócios em estado de flow"
    ],
    troubleshooting: "Se não conseguir manter o foco: 1) Verifique se completou o checklist de ativação, 2) Elimine todas as distrações do ambiente, 3) Ajuste o tempo do Pomodoro conforme sua capacidade atual, 4) Use playlist adequada para o tipo de trabalho",
    advanced_tips: [
      "Combine Flow com Rituais Matinais para máxima efetividade",
      "Use métricas de minutos focados para acompanhar evolução",
      "Experimente diferentes durações de Pomodoro até encontrar seu ritmo ideal",
      "Integre Flow com Gestão de Metas para alinhamento estratégico"
    ],
    philosophy_integration: "O Flow representa a essência do Modo Caverna - o momento onde você se torna um com sua missão, eliminando o ruído externo e canalizando toda sua energia para o progresso. É aqui que a alcateia se fortalece através do foco individual. No Flow, você não está apenas trabalhando, está forjando sua transformação.",
    modo_caverna_level: 3,
    level_name: "O Chamado",
    state_of_mind: "Guerreiro"
  }
];

export class CorrectedKnowledgeSeeder {
  constructor(private db: any) {}

  async seedCorrectedData(): Promise<void> {
    console.log('Starting corrected Modo Caverna knowledge base seeding...');

    // Create enhanced table if it doesn't exist
    await this.createEnhancedTable();

    // Clear existing data
    await this.db.prepare('DELETE FROM knowledge_entries').run();

    // Insert corrected data
    for (const entry of CORRECTED_MODO_CAVERNA_KNOWLEDGE) {
      await this.insertEnhancedEntry(entry);
    }

    console.log(`Seeded ${CORRECTED_MODO_CAVERNA_KNOWLEDGE.length} corrected knowledge entries`);
  }

  private async createEnhancedTable(): Promise<void> {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_module TEXT NOT NULL,
        functionality TEXT NOT NULL,
        description TEXT NOT NULL,
        ui_elements TEXT,
        user_questions_en TEXT,
        user_questions_pt TEXT,
        category TEXT NOT NULL,
        content_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Enhanced fields
        subcategory TEXT,
        difficulty_level TEXT CHECK(difficulty_level IN ('basico', 'intermediario', 'avancado')),
        estimated_time INTEGER,
        prerequisites TEXT, -- JSON array
        related_features TEXT, -- JSON array
        tags TEXT, -- JSON array
        use_cases TEXT, -- JSON array
        ui_elements_pt TEXT, -- JSON array
        user_questions_pt_array TEXT, -- JSON array
        quick_action TEXT,
        step_by_step_guide TEXT, -- JSON array
        real_world_examples TEXT, -- JSON array
        troubleshooting TEXT,
        advanced_tips TEXT, -- JSON array
        philosophy_integration TEXT,
        popularity_score INTEGER DEFAULT 0,
        user_rating REAL DEFAULT 0.0,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Official Modo Caverna fields
        modo_caverna_level INTEGER CHECK(modo_caverna_level BETWEEN 1 AND 7),
        level_name TEXT,
        state_of_mind TEXT
      )
    `).run();
  }

  private async insertEnhancedEntry(entry: CorrectedKnowledgeEntry): Promise<void> {
    await this.db.prepare(`
      INSERT INTO knowledge_entries (
        feature_module, functionality, description, ui_elements,
        user_questions_en, user_questions_pt, category, content_text,
        subcategory, difficulty_level, estimated_time, prerequisites,
        related_features, tags, use_cases, ui_elements_pt,
        user_questions_pt_array, quick_action, step_by_step_guide,
        real_world_examples, troubleshooting, advanced_tips,
        philosophy_integration, popularity_score, user_rating,
        is_active, modo_caverna_level, level_name, state_of_mind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      entry.feature_module,
      entry.functionality,
      entry.description,
      entry.ui_elements,
      entry.user_questions_en,
      entry.user_questions_pt.join(' | '),
      entry.category,
      entry.content_text,
      entry.subcategory,
      entry.difficulty_level,
      entry.estimated_time,
      JSON.stringify(entry.prerequisites),
      JSON.stringify(entry.related_features),
      JSON.stringify(entry.tags),
      JSON.stringify(entry.use_cases),
      JSON.stringify(entry.ui_elements_pt),
      JSON.stringify(entry.user_questions_pt),
      entry.quick_action,
      JSON.stringify(entry.step_by_step_guide),
      JSON.stringify(entry.real_world_examples),
      entry.troubleshooting,
      JSON.stringify(entry.advanced_tips),
      entry.philosophy_integration,
      85, // Default popularity score
      4.5, // Default user rating
      true, // is_active
      entry.modo_caverna_level,
      entry.level_name,
      entry.state_of_mind
    ).run();
  }
}

