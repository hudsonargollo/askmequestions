// AskMeQuestions - Corrected Modo Caverna Knowledge Base Worker
// Manual Deployment Version

// Corrected Modo Caverna Knowledge Base Data
const CORRECTED_MODO_CAVERNA_KNOWLEDGE = [
  {
    feature_module: "Flow Produtividade",
    functionality: "Sistema completo de foco e produtividade",
    description: "Ferramenta principal para ativar o estado de flow e maximizar a produtividade através do foco absoluto",
    category: "Produtividade",
    content_text: "O Flow Produtividade é o coração do sistema Modo Caverna, implementando a filosofia PROPÓSITO > FOCO > PROGRESSO. Inclui: Checklist de Ativação do FLOW para preparar sua mente, Pomodoro com registro preciso de minutos em foco, sistema Kanban para gerenciamento visual de tarefas, e playlists especializadas para estudar, trabalhar e focar. Esta ferramenta elimina distrações e direciona toda energia para o que realmente importa.",
    ui_elements_pt: ["Checklist de Ativação", "Timer Pomodoro", "Quadro Kanban", "Player de Música", "Contador de Minutos"],
    user_questions_pt: [
      "Como ativar o estado de flow?",
      "Como usar o pomodoro?",
      "Como gerenciar tarefas no Kanban?",
      "Qual playlist usar para focar?",
      "Como registrar minutos de foco?"
    ],
    quick_action: "Ativar checklist de flow e iniciar sessão Pomodoro",
    philosophy_integration: "O Flow representa a essência do Modo Caverna - o momento onde você se torna um com sua missão, eliminando o ruído externo e canalizando toda sua energia para o progresso. É aqui que a alcateia se fortalece através do foco individual.",
    modo_caverna_level: 3,
    level_name: "O Chamado",
    state_of_mind: "Guerreiro"
  },
  {
    feature_module: "Desafio Caverna",
    functionality: "Desafio de transformação de 40 dias",
    description: "Sistema de transformação pessoal baseado em 40 dias de disciplina e foco para quebrar padrões limitantes",
    category: "Transformação",
    content_text: "O Desafio Caverna é a jornada de 40 dias que marca a ruptura com a versão antiga de si mesmo. Inclui: mandamentos diários para seguir, hábitos para desenvolver e renunciar, autoavaliação constante do progresso, e sistema de accountability com a alcateia. Não é apenas um desafio, é um ritual de passagem para quem está sério sobre sua transformação.",
    ui_elements_pt: ["Mandamentos", "Hábitos", "Autoavaliação", "Progresso", "Alcateia"],
    user_questions_pt: [
      "Como começar o Desafio Caverna?",
      "Quais são os mandamentos?",
      "Como acompanhar meu progresso?",
      "O que fazer se falhar um dia?",
      "Como a alcateia me ajuda?"
    ],
    quick_action: "Iniciar Desafio de 40 dias e definir mandamentos",
    philosophy_integration: "O Desafio Caverna é onde você declara guerra contra a mediocridade. 40 dias não é tempo suficiente para mudar sua vida, mas é tempo suficiente para provar a si mesmo que você é capaz de mudança. A alcateia testemunha sua transformação.",
    modo_caverna_level: 2,
    level_name: "A Ruptura",
    state_of_mind: "Explorador"
  },
  {
    feature_module: "Rituais Matinais e Noturnos",
    functionality: "Sistema de rituais para início e fim do dia",
    description: "Estrutura de rituais matinais e noturnos para criar foco, clareza e alinhamento com propósito diário",
    category: "Rituais",
    content_text: "Os Rituais Matinais e Noturnos são os pilares que sustentam sua transformação diária. Incluem: rotina matinal para ativar foco e energia, rituais noturnos para reflexão e planejamento, redução do ruído mental através de práticas consistentes. Cada ritual é um momento sagrado onde você se reconecta com seu propósito e reafirma seu compromisso com a excelência.",
    ui_elements_pt: ["Ritual Matinal", "Ritual Noturno", "Checklist", "Reflexão", "Planejamento"],
    user_questions_pt: [
      "Como criar rituais matinais?",
      "Que atividades incluir no ritual noturno?",
      "Como manter consistência?",
      "Quanto tempo deve durar cada ritual?",
      "Como adaptar rituais à minha rotina?"
    ],
    quick_action: "Configurar primeiro ritual matinal de 15 minutos",
    philosophy_integration: "Rituais não são apenas hábitos, são declarações diárias de quem você está se tornando. Cada manhã você renasce, cada noite você reflete sobre o guerreiro que foi durante o dia. A consistência nos rituais constrói a disciplina que transforma vidas.",
    modo_caverna_level: 1,
    level_name: "O Despertar",
    state_of_mind: "Inconformado"
  }
];

// Simple search function
function searchKnowledge(query) {
  const queryLower = query.toLowerCase();
  
  return CORRECTED_MODO_CAVERNA_KNOWLEDGE.filter(entry => {
    return entry.feature_module.toLowerCase().includes(queryLower) ||
           entry.content_text.toLowerCase().includes(queryLower) ||
           entry.user_questions_pt.some(q => q.toLowerCase().includes(queryLower)) ||
           entry.category.toLowerCase().includes(queryLower);
  });
}

// Worker event handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'AskMeQuestions - Corrected Modo Caverna System',
        version: '2.0.0-authentic',
        methodology: 'Official 7 Levels: O Despertar, A Ruptura, O Chamado, A Descoberta, O Discernimento, A Ascensão, A Lenda',
        philosophy: 'PROPÓSITO > FOCO > PROGRESSO',
        community: 'Somos uma ALCATEIA DE LOBOS ativando o Modo Caverna'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Search endpoint
    if (url.pathname === '/api/search' && request.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      
      if (!query) {
        return new Response(JSON.stringify({
          results: [],
          message: 'Por favor, forneça uma consulta de pesquisa'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const results = searchKnowledge(query);
      
      return new Response(JSON.stringify({
        results: results,
        total: results.length,
        query: query,
        message: results.length > 0 ? 
          `Encontrados ${results.length} resultados para "${query}"` :
          `Nenhum resultado encontrado para "${query}". Tente termos como: flow, desafio, rituais, produtividade`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced search endpoint
    if (url.pathname === '/api/search/enhanced' && request.method === 'POST') {
      const body = await request.json();
      const query = body.query || '';
      
      const results = searchKnowledge(query);
      
      // Generate AI-like response based on results
      let answer = '';
      if (results.length > 0) {
        const topResult = results[0];
        answer = `**${topResult.feature_module}** (${topResult.level_name} - ${topResult.state_of_mind})

${topResult.content_text}

**Ação Rápida:** ${topResult.quick_action}

**Filosofia Modo Caverna:** ${topResult.philosophy_integration}

**Elementos da Interface:** ${topResult.ui_elements_pt.join(', ')}`;
      } else {
        answer = 'Não encontrei informações específicas sobre isso na documentação do Modo Caverna. Você pode tentar reformular sua pergunta ou buscar por: flow, desafio caverna, rituais, produtividade.';
      }

      return new Response(JSON.stringify({
        answer: answer,
        searchResults: {
          results: results,
          total_results: results.length,
          intent: query.includes('como') ? 'como_fazer' : 'informacao',
          suggestions: ['flow', 'desafio caverna', 'rituais', 'produtividade']
        },
        intent: query.includes('como') ? 'como_fazer' : 'informacao',
        suggestions: ['flow', 'desafio caverna', 'rituais', 'produtividade']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize corrected data endpoint
    if (url.pathname === '/api/seed-corrected-data' && request.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Corrected Modo Caverna knowledge base initialized successfully',
        entries_loaded: CORRECTED_MODO_CAVERNA_KNOWLEDGE.length,
        methodology: 'Official 7 Levels: O Despertar, A Ruptura, O Chamado, A Descoberta, O Discernimento, A Ascensão, A Lenda',
        philosophy: 'PROPÓSITO > FOCO > PROGRESSO',
        community: 'Somos uma ALCATEIA DE LOBOS ativando o Modo Caverna',
        levels_available: [
          '1. O Despertar (Inconformado)',
          '2. A Ruptura (Explorador)', 
          '3. O Chamado (Guerreiro)',
          '4. A Descoberta (Estrategista)',
          '5. O Discernimento (Sábio)',
          '6. A Ascensão (Mestre)',
          '7. A Lenda (Lenda)'
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({
      message: 'AskMeQuestions - Corrected Modo Caverna Knowledge Base',
      version: '2.0.0-authentic',
      endpoints: [
        'GET /api/health - Health check',
        'GET /api/search?q=query - Search knowledge base',
        'POST /api/search/enhanced - Enhanced search with AI responses',
        'POST /api/seed-corrected-data - Initialize corrected data'
      ],
      philosophy: 'PROPÓSITO > FOCO > PROGRESSO',
      community: 'Somos uma ALCATEIA DE LOBOS ativando o Modo Caverna'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

