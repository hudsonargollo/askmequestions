// Knowledge Base Data Seeder for Enhanced Modo Caverna Content
export interface EnhancedKnowledgeEntry {
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
}

export const ENHANCED_KNOWLEDGE_BASE: EnhancedKnowledgeEntry[] = [
  // Authentication Entries
  {
    feature_module: "Authentication",
    functionality: "User Login",
    description: "Interface principal para acesso de usuários existentes ao Modo Caverna",
    subcategory: "auth_login",
    difficulty_level: "basico",
    estimated_time: 2,
    prerequisites: ["conta_criada", "email_verificado"],
    related_features: ["password_recovery", "registration", "session_management"],
    tags: ["login", "acesso", "autenticacao", "entrar", "signin"],
    use_cases: [
      "Acesso diário matinal para check-in de rituais",
      "Retorno após pausa para continuar desafios",
      "Acesso em novo dispositivo com credenciais existentes"
    ],
    ui_elements: "E-mail field, Senha field, Acessar button, Mantenha-me conectado checkbox",
    ui_elements_pt: ["E-mail", "Senha", "Acessar", "Mantenha-me conectado", "Esqueceu a senha?"],
    user_questions_en: "How do I log in? I can't access my account",
    user_questions_pt: [
      "Como eu faço login?",
      "Não consigo acessar minha conta",
      "Onde está o botão de entrar?",
      "Como entrar no sistema?"
    ],
    category: "authentication",
    content_text: "Para acessar sua conta no Modo Caverna, use o formulário de login com seu e-mail e senha cadastrados. A entrada na caverna representa seu compromisso diário com a transformação pessoal.",
    quick_action: "E-mail → Senha → Acessar",
    step_by_step_guide: [
      "Acesse a página de login do Modo Caverna",
      "Digite seu e-mail cadastrado no campo 'E-mail'",
      "Insira sua senha no campo 'Senha'",
      "Marque 'Mantenha-me conectado' se desejar sessão prolongada",
      "Clique no botão 'Acessar'",
      "Aguarde redirecionamento para a Central Caverna"
    ],
    real_world_examples: [
      "João acessa todo dia às 6h para fazer check-in dos rituais matinais",
      "Maria volta após 3 dias de viagem e precisa recuperar onde parou no desafio",
      "Pedro está em um computador novo no trabalho e precisa acessar sua agenda"
    ],
    troubleshooting: "Se login falhar: 1) Verificar se email/senha estão corretos, 2) Limpar cache do navegador, 3) Tentar recuperação de senha, 4) Verificar conexão com internet",
    advanced_tips: [
      "Use 'Mantenha-me conectado' apenas em dispositivos pessoais",
      "Configure um gerenciador de senhas para acesso mais rápido",
      "Mantenha sua senha segura e única para o Modo Caverna"
    ],
    philosophy_integration: "A entrada na caverna representa o compromisso diário com sua transformação pessoal. Cada login é uma declaração de que você escolhe evoluir conscientemente, isolando-se das distrações para focar no que realmente importa."
  },
  {
    feature_module: "Authentication",
    functionality: "Password Recovery",
    description: "Processo para redefinir senha esquecida",
    subcategory: "auth_recovery",
    difficulty_level: "basico",
    estimated_time: 5,
    prerequisites: ["conta_existente", "email_valido"],
    related_features: ["user_login", "email_verification"],
    tags: ["senha", "recuperar", "esqueci", "redefinir", "password"],
    use_cases: [
      "Esquecimento após período sem uso",
      "Mudança de dispositivo sem lembrar credenciais",
      "Suspeita de comprometimento da conta"
    ],
    ui_elements: "Esqueceu a senha? link, Email field, Enviar link button",
    ui_elements_pt: ["Esqueceu a senha?", "E-mail", "Enviar link de recuperação", "Voltar ao login"],
    user_questions_en: "What if I forget my password? How to reset password?",
    user_questions_pt: [
      "O que eu faço se esquecer minha senha?",
      "Como redefinir minha senha?",
      "Não lembro minha senha",
      "Como recuperar acesso à conta?"
    ],
    category: "authentication",
    content_text: "O processo de recuperação de senha permite que você redefina suas credenciais através de um link enviado por e-mail, garantindo acesso seguro à sua jornada de transformação.",
    quick_action: "Esqueceu a senha? → E-mail → Enviar link",
    step_by_step_guide: [
      "Na tela de login, clique em 'Esqueceu a senha?'",
      "Digite seu e-mail cadastrado",
      "Clique em 'Enviar link de recuperação'",
      "Verifique sua caixa de entrada (e spam)",
      "Clique no link recebido por e-mail",
      "Crie uma nova senha forte",
      "Confirme a nova senha",
      "Retorne ao login com as novas credenciais"
    ],
    real_world_examples: [
      "Ana não acessa há 2 meses e esqueceu a senha",
      "Carlos suspeita que alguém acessou sua conta",
      "Lucia trocou de celular e não lembra a senha"
    ],
    troubleshooting: "Se não receber o e-mail: 1) Verificar pasta de spam, 2) Aguardar até 10 minutos, 3) Confirmar e-mail correto, 4) Tentar novamente, 5) Contatar suporte se persistir",
    advanced_tips: [
      "Use senhas únicas e fortes (mínimo 8 caracteres)",
      "Considere usar um gerenciador de senhas",
      "Anote a nova senha temporariamente em local seguro",
      "Faça login imediatamente após alterar para confirmar"
    ],
    philosophy_integration: "Mesmo quando perdemos o caminho, a alcatéia oferece uma forma de retornar. A recuperação de senha simboliza que sempre há uma segunda chance para retomar sua jornada de transformação."
  },
  // Onboarding Entries
  {
    feature_module: "Onboarding",
    functionality: "Welcome Screen",
    description: "Primeira tela de boas-vindas para novos membros da alcatéia",
    subcategory: "onboarding_welcome",
    difficulty_level: "basico",
    estimated_time: 3,
    prerequisites: ["conta_criada"],
    related_features: ["ai_assistant_setup", "video_tour", "profile_setup"],
    tags: ["boas-vindas", "primeiro-acesso", "introducao", "caverna", "welcome"],
    use_cases: [
      "Primeiro acesso após criar conta",
      "Retorno para completar onboarding",
      "Reengajamento após período inativo"
    ],
    ui_elements: "Seja bem-vindo(a) à Caverna title, Começar jornada button",
    ui_elements_pt: ["Seja bem-vindo(a) à Caverna", "Começar jornada", "Pular introdução", "Saiba mais"],
    user_questions_en: "What's the first screen I see? How to get started?",
    user_questions_pt: [
      "Qual a primeira tela que vejo?",
      "Como começar no Modo Caverna?",
      "O que fazer primeiro?",
      "Como iniciar minha jornada?"
    ],
    category: "onboarding",
    content_text: "A tela de boas-vindas é seu primeiro contato com a filosofia Modo Caverna, apresentando os conceitos fundamentais de transformação pessoal e vida intencional.",
    quick_action: "Ler introdução → Começar jornada",
    step_by_step_guide: [
      "Leia a mensagem de boas-vindas com atenção",
      "Absorva a filosofia do Modo Caverna",
      "Entenda que você está entrando em uma comunidade de transformação",
      "Clique em 'Começar jornada' para o onboarding completo",
      "Ou 'Pular introdução' se já conhece a plataforma"
    ],
    real_world_examples: [
      "Roberto cria conta e quer entender o que é Modo Caverna",
      "Fernanda volta após 6 meses para retomar sua jornada",
      "Marcos foi indicado por um amigo e quer conhecer o sistema"
    ],
    troubleshooting: "Se a tela não carregar: 1) Aguardar carregamento completo, 2) Atualizar página, 3) Verificar conexão, 4) Tentar outro navegador",
    advanced_tips: [
      "Dedique tempo para absorver a filosofia antes de prosseguir",
      "Mantenha mente aberta para nova abordagem de produtividade",
      "Prepare-se mentalmente para transformação real"
    ],
    philosophy_integration: "Bem-vindo à caverna, lobo. Aqui você escolhe o isolamento das distrações superficiais, a intencionalidade em cada ação e a urgência de quem sabe que o tempo está passando. Somos uma alcatéia ativando o Modo Caverna."
  },
  {
    feature_module: "Onboarding",
    functionality: "AI Assistant Setup",
    description: "Configuração do assistente de IA via WhatsApp para acompanhamento personalizado",
    subcategory: "onboarding_ai_setup",
    difficulty_level: "intermediario",
    estimated_time: 5,
    prerequisites: ["welcome_screen_completed"],
    related_features: ["whatsapp_integration", "notifications", "reminders"],
    tags: ["assistente", "ia", "whatsapp", "acompanhamento", "ai"],
    use_cases: [
      "Configurar lembretes diários de rituais",
      "Receber motivação personalizada",
      "Acompanhamento de progresso via WhatsApp"
    ],
    ui_elements: "Seu WhatsApp field, Conectar assistente button, Pular por agora link",
    ui_elements_pt: ["Seu WhatsApp", "Conectar assistente", "Pular por agora", "Testar conexão"],
    user_questions_en: "What is the AI assistant? How to connect WhatsApp?",
    user_questions_pt: [
      "O que é o assistente de IA?",
      "Como conectar meu WhatsApp?",
      "Para que serve o assistente?",
      "É seguro dar meu número?"
    ],
    category: "onboarding",
    content_text: "O assistente de IA é seu companheiro digital na jornada de transformação, enviando lembretes, motivação e acompanhamento personalizado via WhatsApp.",
    quick_action: "Número do WhatsApp → Conectar assistente",
    step_by_step_guide: [
      "Digite seu número de WhatsApp no formato (11) 99999-9999",
      "Clique em 'Conectar assistente'",
      "Aguarde mensagem de verificação no WhatsApp",
      "Responda à mensagem conforme orientado",
      "Configure preferências de horário e frequência",
      "Confirme ativação do assistente"
    ],
    real_world_examples: [
      "Sandra quer lembretes para meditar às 6h da manhã",
      "Paulo precisa de motivação nos dias difíceis do desafio",
      "Carla quer acompanhar progresso sem abrir o app constantemente"
    ],
    troubleshooting: "Se não receber mensagens: 1) Verificar número digitado, 2) Confirmar WhatsApp funcionando, 3) Verificar bloqueios de números desconhecidos, 4) Aguardar até 24h, 5) Reconectar se necessário",
    advanced_tips: [
      "Configure horários que funcionem com sua rotina",
      "Responda às mensagens para melhorar personalização",
      "Use como accountability partner digital",
      "Ajuste configurações conforme evolução"
    ],
    philosophy_integration: "O assistente é como um lobo experiente da alcatéia que te acompanha, lembrando dos compromissos com sua transformação e oferecendo sabedoria nos momentos certos."
  },
  // Dashboard Entries
  {
    feature_module: "Dashboard",
    functionality: "Central Caverna",
    description: "Painel principal de comando da jornada de transformação pessoal",
    subcategory: "dashboard_main",
    difficulty_level: "basico",
    estimated_time: 3,
    prerequisites: ["onboarding_completed"],
    related_features: ["streak_counter", "rituals", "challenges", "agenda"],
    tags: ["dashboard", "painel", "central", "caverna", "inicio"],
    use_cases: [
      "Check-in matinal diário",
      "Visão geral do progresso",
      "Navegação para outras funcionalidades",
      "Acompanhamento de metas"
    ],
    ui_elements: "Navigation tabs, Widgets, Quick actions, Progress indicators",
    ui_elements_pt: ["Central Caverna", "Visão Geral", "Ações Rápidas", "Progresso", "Navegação"],
    user_questions_en: "What's on the main screen? How to navigate?",
    user_questions_pt: [
      "O que tem na tela principal?",
      "Como navegar no sistema?",
      "Onde vejo meu progresso?",
      "Como usar o dashboard?"
    ],
    category: "dashboard",
    content_text: "A Central Caverna é seu centro de comando pessoal, oferecendo visão completa da jornada de transformação com widgets de progresso, ações rápidas e navegação intuitiva.",
    quick_action: "Visualizar progresso → Acessar funcionalidades",
    step_by_step_guide: [
      "Observe o contador de dias consecutivos",
      "Verifique status dos rituais diários",
      "Analise progresso dos desafios ativos",
      "Use ações rápidas para tarefas frequentes",
      "Navegue pelas abas para diferentes seções",
      "Identifique notificações importantes"
    ],
    real_world_examples: [
      "Marina faz check-in matinal para ver o que precisa fazer hoje",
      "Ricardo verifica se manteve a sequência de dias",
      "Juliana usa ações rápidas para marcar rituais como completos"
    ],
    troubleshooting: "Se dashboard não carrega: 1) Atualizar página (F5), 2) Verificar conexão, 3) Aguardar sincronização, 4) Fazer logout/login, 5) Limpar cache",
    advanced_tips: [
      "Personalize ordem dos widgets conforme prioridade",
      "Use atalhos de teclado para navegação rápida",
      "Configure notificações para lembretes importantes",
      "Mantenha como página inicial do navegador"
    ],
    philosophy_integration: "A Central Caverna é o coração da sua transformação - um espaço sagrado onde você monitora seu progresso, celebra vitórias e planeja os próximos passos da jornada."
  },
  // Challenge Entries
  {
    feature_module: "Cave Challenge",
    functionality: "Challenge Welcome",
    description: "Portal de entrada para o desafio de transformação de 40 dias",
    subcategory: "challenges_welcome",
    difficulty_level: "intermediario",
    estimated_time: 10,
    prerequisites: ["rituais_configurados", "perfil_completo"],
    related_features: ["challenge_setup", "habit_tracking", "community"],
    tags: ["desafio", "40-dias", "transformacao", "compromisso", "challenge"],
    use_cases: [
      "Iniciar primeiro desafio de transformação",
      "Retomar desafio após pausa",
      "Entender compromisso necessário"
    ],
    ui_elements: "Desafio Caverna title, Eu aceito o desafio button, Saiba mais link",
    ui_elements_pt: ["Desafio Caverna", "Eu aceito o desafio", "Saiba mais", "Requisitos", "Compromisso"],
    user_questions_en: "How do I start the challenge? What is the 40-day challenge?",
    user_questions_pt: [
      "Como eu começo o desafio?",
      "O que é o Desafio Caverna?",
      "Estou pronto para o desafio?",
      "Quais são os requisitos?"
    ],
    category: "challenges",
    content_text: "O Desafio Caverna é uma jornada intensiva de 40 dias focada em transformação profunda através da eliminação de hábitos destrutivos e criação de novos padrões de excelência.",
    quick_action: "Ler sobre desafio → Eu aceito o desafio",
    step_by_step_guide: [
      "Leia sobre o compromisso de 40 dias",
      "Avalie se está pronto para a jornada",
      "Entenda que é transformação real, não jogo",
      "Clique 'Eu aceito o desafio' apenas se comprometido",
      "Prepare-se mentalmente para 40 dias de disciplina",
      "Visualize-se completando a transformação"
    ],
    real_world_examples: [
      "André quer eliminar redes sociais e focar nos estudos",
      "Beatriz decidiu criar hábito de exercícios e leitura diária",
      "Carlos quer transformar completamente sua rotina matinal"
    ],
    troubleshooting: "Se não se sente pronto: 1) Comece com rituais simples, 2) Fortaleça consistência básica, 3) Participe da comunidade, 4) Defina objetivos menores, 5) Aguarde momento apropriado",
    advanced_tips: [
      "Escolha período com menos compromissos externos",
      "Comunique desafio para pessoas próximas",
      "Prepare ambiente físico para sucesso",
      "Tenha plano B para dias difíceis"
    ],
    philosophy_integration: "O Desafio Caverna é o ritual de passagem da alcatéia. É onde você prova para si mesmo que tem a força interior para transformar intenção em ação, disciplina em identidade."
  }
];

export class KnowledgeDataSeeder {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async seedEnhancedData(): Promise<void> {
    console.log('Starting enhanced knowledge base data seeding...');

    try {
      // First, update existing entries with enhanced data
      for (const entry of ENHANCED_KNOWLEDGE_BASE) {
        await this.updateExistingEntry(entry);
      }

      // Then seed synonym data
      await this.seedSynonymData();

      // Seed intent patterns
      await this.seedIntentPatterns();

      console.log('✅ Enhanced knowledge base data seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding enhanced data:', error);
      throw error;
    }
  }

  private async updateExistingEntry(entry: EnhancedKnowledgeEntry): Promise<void> {
    try {
      const result = await this.db.prepare(`
        UPDATE knowledge_entries SET
          subcategory = ?,
          difficulty_level = ?,
          estimated_time = ?,
          prerequisites = ?,
          related_features = ?,
          tags = ?,
          use_cases = ?,
          ui_elements_pt = ?,
          user_questions_pt = ?,
          quick_action = ?,
          step_by_step_guide = ?,
          real_world_examples = ?,
          troubleshooting = ?,
          advanced_tips = ?,
          philosophy_integration = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE feature_module = ? AND functionality = ?
      `).bind(
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
        entry.feature_module,
        entry.functionality
      ).run();

      if (result.changes === 0) {
        // Entry doesn't exist, insert it
        await this.insertNewEntry(entry);
      }
    } catch (error) {
      console.error(`Error updating entry ${entry.feature_module} - ${entry.functionality}:`, error);
    }
  }

  private async insertNewEntry(entry: EnhancedKnowledgeEntry): Promise<void> {
    await this.db.prepare(`
      INSERT INTO knowledge_entries (
        feature_module, functionality, description, subcategory, difficulty_level,
        estimated_time, prerequisites, related_features, tags, use_cases,
        ui_elements, ui_elements_pt, user_questions_en, user_questions_pt,
        category, content_text, quick_action, step_by_step_guide,
        real_world_examples, troubleshooting, advanced_tips, philosophy_integration,
        last_updated, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, true)
    `).bind(
      entry.feature_module,
      entry.functionality,
      entry.description,
      entry.subcategory,
      entry.difficulty_level,
      entry.estimated_time,
      JSON.stringify(entry.prerequisites),
      JSON.stringify(entry.related_features),
      JSON.stringify(entry.tags),
      JSON.stringify(entry.use_cases),
      entry.ui_elements,
      JSON.stringify(entry.ui_elements_pt),
      entry.user_questions_en,
      JSON.stringify(entry.user_questions_pt),
      entry.category,
      entry.content_text,
      entry.quick_action,
      JSON.stringify(entry.step_by_step_guide),
      JSON.stringify(entry.real_world_examples),
      entry.troubleshooting,
      JSON.stringify(entry.advanced_tips),
      entry.philosophy_integration
    ).run();
  }

  private async seedSynonymData(): Promise<void> {
    const synonyms = [
      { term: 'login', synonyms: ['entrar', 'acessar', 'signin', 'access', 'autenticacao', 'autenticação'], category: 'auth' },
      { term: 'desafio', synonyms: ['challenge', '40-dias', 'transformacao', 'transformação', 'jornada'], category: 'challenges' },
      { term: 'ritual', synonyms: ['rotina', 'habito', 'hábito', 'routine', 'manhã', 'noite'], category: 'rituals' },
      { term: 'agenda', synonyms: ['calendario', 'calendário', 'schedule', 'compromisso', 'evento'], category: 'calendar' },
      { term: 'comunidade', synonyms: ['feed', 'social', 'alcateia', 'alcatéia', 'lobos', 'wolves'], category: 'community' },
      { term: 'forja', synonyms: ['fitness', 'treino', 'workout', 'exercicio', 'exercício', 'saude', 'saúde'], category: 'fitness' },
      { term: 'metas', synonyms: ['objetivos', 'goals', 'targets', 'alvos', 'propositos', 'propósitos'], category: 'goals' },
      { term: 'manifestacao', synonyms: ['manifestação', 'lei-da-atracao', 'lei-da-atração', 'visualizacao', 'visualização'], category: 'manifestation' },
      { term: 'produtividade', synonyms: ['pomodoro', 'tarefas', 'foco', 'flow', 'concentracao', 'concentração'], category: 'productivity' },
      { term: 'sequencia', synonyms: ['sequência', 'streak', 'dias-consecutivos', 'consistencia', 'consistência'], category: 'dashboard' }
    ];

    for (const synonym of synonyms) {
      await this.db.prepare(`
        INSERT OR REPLACE INTO search_synonyms (term, synonyms, category, language)
        VALUES (?, ?, ?, 'pt')
      `).bind(synonym.term, JSON.stringify(synonym.synonyms), synonym.category).run();
    }
  }

  private async seedIntentPatterns(): Promise<void> {
    const patterns = [
      { pattern: 'como', intent_type: 'how_to', response_template: 'step_by_step_guide' },
      { pattern: 'o que é', intent_type: 'what_is', response_template: 'concept_explanation' },
      { pattern: 'onde', intent_type: 'where_find', response_template: 'navigation_guide' },
      { pattern: 'não funciona', intent_type: 'troubleshooting', response_template: 'troubleshooting_guide' },
      { pattern: 'erro', intent_type: 'troubleshooting', response_template: 'troubleshooting_guide' },
      { pattern: 'problema', intent_type: 'troubleshooting', response_template: 'troubleshooting_guide' }
    ];

    for (const pattern of patterns) {
      await this.db.prepare(`
        INSERT OR REPLACE INTO search_intent_patterns (pattern, intent_type, response_template, language, is_active)
        VALUES (?, ?, ?, 'pt', true)
      `).bind(pattern.pattern, pattern.intent_type, pattern.response_template).run();
    }
  }
}

