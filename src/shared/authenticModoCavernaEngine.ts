import { ImageGenerationParams } from './types';

export interface AuthenticContextualImageRequest {
  query: string;
  intent: 'como_fazer' | 'solucao_problema' | 'o_que_e' | 'motivacao' | 'celebracao' | 'orientacao';
  userLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Official Modo Caverna 7 Levels
  emotionalTone: 'encorajador' | 'serio' | 'celebrativo' | 'focado' | 'compassivo' | 'energetico';
  knowledgeCategory: string;
  timeOfDay?: 'manha' | 'tarde' | 'noite' | 'madrugada';
  userProgress?: 'lutando' | 'progredindo' | 'conquistando' | 'estagnado';
  challengeDay?: number; // Day in 40-day challenge
  ritualContext?: 'matinal' | 'noturno' | 'flow' | 'none';
}

// Official Modo Caverna 7 Levels with authentic characteristics
const AUTHENTIC_LEVEL_CHARACTERISTICS = {
  1: { // O Despertar (The Awakening) - Inconformado (Nonconformist)
    level_name: 'O Despertar',
    state_of_mind: 'Inconformado',
    characterRole: 'guia_inicial',
    relationship: 'mentor_iniciante',
    complexity: 'simples',
    elements: ['caverna_basica', 'chama_inicial', 'despertar_consciencia'],
    description: 'Desconforto inicial e questionamento da realidade atual',
    visual_theme: 'awakening_flame',
    captain_mood: 'patient_guide'
  },
  2: { // A Ruptura (The Rupture) - Explorador (Explorer)
    level_name: 'A Ruptura',
    state_of_mind: 'Explorador',
    characterRole: 'mentor_ruptura',
    relationship: 'mentor_explorador',
    complexity: 'desenvolvimento',
    elements: ['quebra_correntes', 'ferramentas_exploracao', 'descoberta_caminhos'],
    description: 'Quebra de padrões antigos e limitações',
    visual_theme: 'breaking_chains',
    captain_mood: 'encouraging_mentor'
  },
  3: { // O Chamado (The Call) - Guerreiro (Warrior)
    level_name: 'O Chamado',
    state_of_mind: 'Guerreiro',
    characterRole: 'treinador_guerreiro',
    relationship: 'treinador_guerreiro',
    complexity: 'intermediario',
    elements: ['equipamentos_guerra', 'ferramentas_estrategicas', 'preparacao_batalha'],
    description: 'Reconhecimento de padrões e pensamento estratégico',
    visual_theme: 'warrior_call',
    captain_mood: 'strategic_trainer'
  },
  4: { // A Descoberta (The Discovery) - Estrategista (Strategist)
    level_name: 'A Descoberta',
    state_of_mind: 'Estrategista',
    characterRole: 'conselheiro_estrategico',
    relationship: 'conselheiro_estrategista',
    complexity: 'avancado',
    elements: ['mapas_estrategicos', 'ferramentas_consistencia', 'elementos_planejamento'],
    description: 'Compreensão da consistência e prática diária',
    visual_theme: 'strategic_discovery',
    captain_mood: 'wise_advisor'
  },
  5: { // O Discernimento (The Discernment) - Sábio (Wise)
    level_name: 'O Discernimento',
    state_of_mind: 'Sábio',
    characterRole: 'companheiro_sabio',
    relationship: 'par_sabio',
    complexity: 'sofisticado',
    elements: ['artefatos_sabedoria', 'simbolos_discernimento', 'aplicacao_conhecimento'],
    description: 'Desenvolvimento da sabedoria para aplicar conhecimento',
    visual_theme: 'wise_discernment',
    captain_mood: 'wise_companion'
  },
  6: { // A Ascensão (The Ascension) - Mestre (Master)
    level_name: 'A Ascensão',
    state_of_mind: 'Mestre',
    characterRole: 'par_mestre',
    relationship: 'mestre_mestre',
    complexity: 'expert',
    elements: ['simbolos_maestria', 'elementos_ascensao', 'ferramentas_autodirecionamento'],
    description: 'Tornar-se autodirigido e imparável',
    visual_theme: 'master_ascension',
    captain_mood: 'peer_master'
  },
  7: { // A Lenda (The Legend) - Lenda (Legend)
    level_name: 'A Lenda',
    state_of_mind: 'Lenda',
    characterRole: 'companheiro_lenda',
    relationship: 'lenda_lenda',
    complexity: 'lendario',
    elements: ['regalia_lenda', 'simbolos_inspiracao', 'incorporacao_transformacao'],
    description: 'Incorporação da transformação e inspiração de outros',
    visual_theme: 'legendary_embodiment',
    captain_mood: 'fellow_legend'
  }
};

// Intent-based configurations with Portuguese context
const AUTHENTIC_INTENT_CONFIGURATIONS = {
  'como_fazer': {
    poses: ['ensinando', 'apontando', 'demonstrando', 'guiando'],
    outfits: ['guia', 'mentor', 'instrutor'],
    props: ['pergaminho', 'ponteiro', 'ferramentas'],
    backgrounds: ['caverna_sala_aula', 'espaco_tutorial'],
    captain_expression: 'teaching_focused'
  },
  'solucao_problema': {
    poses: ['resolvendo_problema', 'pensando', 'analisando', 'focado'],
    outfits: ['focado', 'tecnico', 'solucionador'],
    props: ['lupa', 'ferramentas', 'equipamento_diagnostico'],
    backgrounds: ['oficina', 'caverna_analise'],
    captain_expression: 'problem_solving'
  },
  'o_que_e': {
    poses: ['explicando', 'sabio', 'contemplativo', 'ensinando'],
    outfits: ['sabio', 'filosofo', 'sage'],
    props: ['livro', 'bola_cristal', 'pergaminho_antigo'],
    backgrounds: ['biblioteca_caverna', 'camara_sabedoria'],
    captain_expression: 'wise_explaining'
  },
  'motivacao': {
    poses: ['encorajando', 'inspirando', 'poderoso', 'determinado'],
    outfits: ['guerreiro', 'lider', 'motivador'],
    props: ['bandeira', 'tocha', 'simbolo_motivacional'],
    backgrounds: ['pico_montanha', 'caverna_vitoria'],
    captain_expression: 'motivational_fire'
  },
  'celebracao': {
    poses: ['celebrando', 'vitorioso', 'orgulhoso', 'alegre'],
    outfits: ['cerimonial', 'vitoria', 'festivo'],
    props: ['trofeu', 'itens_celebracao', 'badge_conquista'],
    backgrounds: ['caverna_celebracao', 'hall_conquistas'],
    captain_expression: 'joyful_celebration'
  },
  'orientacao': {
    poses: ['guiando', 'liderando', 'mostrando_caminho', 'protetor'],
    outfits: ['guia', 'desbravador', 'protetor'],
    props: ['bussola', 'mapa', 'lanterna'],
    backgrounds: ['caverna_caminho', 'paisagem_jornada'],
    captain_expression: 'guiding_presence'
  }
};

// Emotional tone modifiers with Brazilian cultural context
const AUTHENTIC_EMOTIONAL_MODIFIERS = {
  'encorajador': {
    lighting: 'luz_calorosa_brilhante',
    expression: 'sorriso_encorajador',
    posture: 'aberto_acolhedor',
    colors: ['laranja_caloroso', 'amarelo_encorajador'],
    brazilian_elements: ['energia_brasileira', 'calor_humano']
  },
  'serio': {
    lighting: 'dramatico_focado',
    expression: 'determinado_serio',
    posture: 'forte_confiante',
    colors: ['vermelho_profundo', 'cinza_serio'],
    brazilian_elements: ['determinacao_nordestina', 'garra_brasileira']
  },
  'celebrativo': {
    lighting: 'brilhante_festivo',
    expression: 'alegre_orgulhoso',
    posture: 'vitorioso_elevado',
    colors: ['ouro_celebracao', 'vermelho_vitoria'],
    brazilian_elements: ['festa_brasileira', 'alegria_carnaval']
  },
  'focado': {
    lighting: 'spotlight_concentrado',
    expression: 'intenso_focado',
    posture: 'alerta_pronto',
    colors: ['azul_foco', 'roxo_concentracao'],
    brazilian_elements: ['foco_paulista', 'disciplina_militar']
  },
  'compassivo': {
    lighting: 'suave_gentil',
    expression: 'compreensivo_gentil',
    posture: 'cuidadoso_apoiador',
    colors: ['azul_gentil', 'verde_compassivo'],
    brazilian_elements: ['acolhimento_mineiro', 'carinho_maternal']
  },
  'energetico': {
    lighting: 'dinamico_brilhante',
    expression: 'animado_energetico',
    posture: 'ativo_dinamico',
    colors: ['vermelho_energia', 'laranja_dinamico'],
    brazilian_elements: ['energia_carioca', 'vivacidade_baiana']
  }
};

// Brazilian cultural elements specific to Modo Caverna
const MODO_CAVERNA_CULTURAL_ELEMENTS = {
  expressions: {
    encorajador: ['sorriso_brasileiro', 'jeitinho_positivo', 'energia_tropical'],
    serio: ['determinacao_sertaneja', 'foco_bandeirante', 'garra_gaucha'],
    celebrativo: ['festa_junina', 'alegria_carnaval', 'vitoria_copa']
  },
  props: {
    cultural: ['bandeira_brasil', 'elementos_regionais', 'simbolos_forca'],
    motivational: ['frase_motivacional_pt', 'ditado_popular', 'expressao_guerreira'],
    alcateia: ['simbolos_matilha', 'elementos_lobos', 'uniao_forca']
  },
  backgrounds: {
    regional: ['caverna_amazonica', 'gruta_nordestina', 'caverna_sulista'],
    cultural: ['ambiente_brasileiro', 'cenario_tropical', 'paisagem_nacional'],
    modo_caverna: ['caverna_transformacao', 'ambiente_foco', 'espaco_alcateia']
  },
  philosophy_elements: {
    proposito: ['simbolos_proposito', 'direcao_clara', 'norte_verdadeiro'],
    foco: ['elementos_concentracao', 'eliminacao_ruido', 'laser_mental'],
    progresso: ['simbolos_evolucao', 'crescimento_visivel', 'transformacao_real']
  }
};

// 40-Day Challenge specific elements
const DESAFIO_CAVERNA_ELEMENTS = {
  early_days: { // Days 1-14
    captain_mood: 'supportive_strict',
    visual_elements: ['chama_inicial', 'ferramentas_basicas', 'determinacao_inicial'],
    message_tone: 'encouraging_discipline'
  },
  middle_days: { // Days 15-28
    captain_mood: 'proud_mentor',
    visual_elements: ['chama_crescente', 'ferramentas_avancadas', 'momentum_visivel'],
    message_tone: 'proud_progression'
  },
  final_days: { // Days 29-40
    captain_mood: 'warrior_companion',
    visual_elements: ['chama_forte', 'maestria_ferramentas', 'transformacao_evidente'],
    message_tone: 'warrior_celebration'
  }
};

export class AuthenticModoCavernaEngine {
  private userPreferences: Map<string, any> = new Map();

  /**
   * Generate authentic Modo Caverna contextual image based on official methodology
   */
  generateAuthenticImage(request: AuthenticContextualImageRequest, userId?: string): ImageGenerationParams {
    // Get authentic level configuration
    const levelConfig = this.getAuthenticLevelConfig(request.userLevel || 1);
    
    // Get intent-based configuration
    const intentConfig = this.getAuthenticIntentConfig(request.intent);
    
    // Apply emotional tone with Brazilian cultural context
    const emotionalConfig = this.applyAuthenticEmotionalTone(request.emotionalTone);
    
    // Add Modo Caverna philosophy elements
    const philosophyConfig = this.addPhilosophyElements(request);
    
    // Add 40-day challenge context if applicable
    const challengeConfig = this.addChallengeContext(request.challengeDay);
    
    // Apply ritual context
    const ritualConfig = this.addRitualContext(request.ritualContext);
    
    // Combine all authentic configurations
    return this.combineAuthenticConfigurations(
      levelConfig,
      intentConfig,
      emotionalConfig,
      philosophyConfig,
      challengeConfig,
      ritualConfig,
      request
    );
  }

  /**
   * Analyze user context for authentic Modo Caverna experience
   */
  analyzeAuthenticUserContext(userId: string, recentActivity: any[]): any {
    // Analyze based on official Modo Caverna methodology
    const currentLevel = this.determineUserLevel(recentActivity);
    const challengeProgress = this.analyzeChallengeProgress(recentActivity);
    const ritualConsistency = this.analyzeRitualConsistency(recentActivity);
    const philosophyAlignment = this.analyzePhilosophyAlignment(recentActivity);
    
    return {
      current_level: currentLevel,
      level_name: AUTHENTIC_LEVEL_CHARACTERISTICS[currentLevel].level_name,
      state_of_mind: AUTHENTIC_LEVEL_CHARACTERISTICS[currentLevel].state_of_mind,
      challenge_progress: challengeProgress,
      ritual_consistency: ritualConsistency,
      philosophy_alignment: philosophyAlignment,
      recommended_captain_mood: this.recommendCaptainMood(currentLevel, challengeProgress, ritualConsistency)
    };
  }

  /**
   * Generate contextual suggestions based on authentic methodology
   */
  getAuthenticSuggestions(query: string, category: string, userLevel: number): AuthenticContextualImageRequest[] {
    const suggestions: AuthenticContextualImageRequest[] = [];
    
    // Detect intent based on Portuguese query patterns
    const detectedIntent = this.detectPortugueseIntent(query);
    
    // Generate suggestions based on user level and authentic methodology
    const levelConfig = AUTHENTIC_LEVEL_CHARACTERISTICS[userLevel];
    const appropriateTones = this.getAppropriateTonesForLevel(userLevel);
    
    appropriateTones.forEach(tone => {
      suggestions.push({
        query,
        intent: detectedIntent,
        emotionalTone: tone,
        knowledgeCategory: category,
        userLevel: userLevel as any,
        timeOfDay: this.getCurrentBrazilianTimeContext(),
        ritualContext: this.detectRitualContext(query)
      });
    });
    
    return suggestions;
  }

  // Private helper methods
  private getAuthenticLevelConfig(level: number) {
    return AUTHENTIC_LEVEL_CHARACTERISTICS[level] || AUTHENTIC_LEVEL_CHARACTERISTICS[1];
  }

  private getAuthenticIntentConfig(intent: AuthenticContextualImageRequest['intent']) {
    return AUTHENTIC_INTENT_CONFIGURATIONS[intent] || AUTHENTIC_INTENT_CONFIGURATIONS['orientacao'];
  }

  private applyAuthenticEmotionalTone(tone: AuthenticContextualImageRequest['emotionalTone']) {
    return AUTHENTIC_EMOTIONAL_MODIFIERS[tone] || AUTHENTIC_EMOTIONAL_MODIFIERS['encorajador'];
  }

  private addPhilosophyElements(request: AuthenticContextualImageRequest) {
    // Add PROPÓSITO > FOCO > PROGRESSO elements
    const philosophyElements = MODO_CAVERNA_CULTURAL_ELEMENTS.philosophy_elements;
    
    if (request.intent === 'motivacao') {
      return philosophyElements.proposito;
    } else if (request.intent === 'como_fazer') {
      return philosophyElements.foco;
    } else {
      return philosophyElements.progresso;
    }
  }

  private addChallengeContext(challengeDay?: number) {
    if (!challengeDay) return null;
    
    if (challengeDay <= 14) {
      return DESAFIO_CAVERNA_ELEMENTS.early_days;
    } else if (challengeDay <= 28) {
      return DESAFIO_CAVERNA_ELEMENTS.middle_days;
    } else {
      return DESAFIO_CAVERNA_ELEMENTS.final_days;
    }
  }

  private addRitualContext(ritualContext?: AuthenticContextualImageRequest['ritualContext']) {
    if (!ritualContext || ritualContext === 'none') return null;
    
    const ritualElements = {
      'matinal': ['energia_manha', 'preparacao_dia', 'foco_inicial'],
      'noturno': ['reflexao_noite', 'gratidao', 'preparacao_amanha'],
      'flow': ['concentracao_maxima', 'eliminacao_distracao', 'foco_absoluto']
    };
    
    return ritualElements[ritualContext] || null;
  }

  private combineAuthenticConfigurations(
    levelConfig: any,
    intentConfig: any,
    emotionalConfig: any,
    philosophyConfig: any,
    challengeConfig: any,
    ritualConfig: any,
    request: AuthenticContextualImageRequest
  ): ImageGenerationParams {
    // Intelligent selection based on authentic Modo Caverna methodology
    const pose = this.selectAuthenticPose(levelConfig, intentConfig, emotionalConfig);
    const outfit = this.selectAuthenticOutfit(levelConfig, request.userLevel || 1);
    const footwear = this.selectAuthenticFootwear(levelConfig);
    const prop = this.selectAuthenticProp(intentConfig, philosophyConfig, challengeConfig);
    
    return {
      pose,
      outfit,
      footwear,
      prop,
      frameType: this.determineAuthenticFrameType(request),
      frameId: this.generateAuthenticFrameId(request)
    };
  }

  private selectAuthenticPose(levelConfig: any, intentConfig: any, emotionalConfig: any): string {
    // Priority: level-appropriate > intent-based > emotional tone
    const levelMood = levelConfig.captain_mood;
    const intentPoses = intentConfig.poses;
    const emotionalPosture = emotionalConfig.posture;
    
    return this.findBestAuthenticMatch(intentPoses, [levelMood, emotionalPosture]) || intentPoses[0];
  }

  private selectAuthenticOutfit(levelConfig: any, userLevel: number): string {
    const stateOfMind = levelConfig.state_of_mind.toLowerCase();
    const levelName = levelConfig.level_name.toLowerCase().replace(/\s+/g, '_');
    
    // Map to authentic Modo Caverna progression
    const outfitMap = {
      1: 'inconformado_guide', // O Despertar
      2: 'explorador_mentor', // A Ruptura  
      3: 'guerreiro_trainer', // O Chamado
      4: 'estrategista_advisor', // A Descoberta
      5: 'sabio_companion', // O Discernimento
      6: 'mestre_peer', // A Ascensão
      7: 'lenda_fellow' // A Lenda
    };
    
    return outfitMap[userLevel as keyof typeof outfitMap] || 'inconformado_guide';
  }

  private selectAuthenticFootwear(levelConfig: any): string {
    const stateOfMind = levelConfig.state_of_mind.toLowerCase();
    return `${stateOfMind}_boots`;
  }

  private selectAuthenticProp(intentConfig: any, philosophyConfig: any, challengeConfig: any): string | undefined {
    const intentProps = intentConfig.props || [];
    const philosophyProps = philosophyConfig || [];
    const challengeProps = challengeConfig?.visual_elements || [];
    
    // Combine all relevant props
    const allProps = [...intentProps, ...philosophyProps, ...challengeProps];
    
    return allProps.length > 0 ? allProps[0] : undefined;
  }

  private determineAuthenticFrameType(request: AuthenticContextualImageRequest): 'standard' | 'onboarding' | 'sequence' {
    // Based on authentic Modo Caverna levels
    if (request.userLevel && request.userLevel <= 2) { // O Despertar & A Ruptura
      return 'onboarding';
    } else if (request.intent === 'como_fazer') {
      return 'sequence';
    } else {
      return 'standard';
    }
  }

  private generateAuthenticFrameId(request: AuthenticContextualImageRequest): string | undefined {
    const frameType = this.determineAuthenticFrameType(request);
    
    if (frameType === 'onboarding') {
      const levelNames = ['despertar', 'ruptura', 'chamado', 'descoberta', 'discernimento', 'ascensao', 'lenda'];
      const levelName = levelNames[(request.userLevel || 1) - 1];
      return `onboard_${levelName}_${request.userLevel || 1}`;
    } else if (frameType === 'sequence') {
      return `seq_${request.intent}_01`;
    }
    
    return undefined;
  }

  // Utility methods for authentic Modo Caverna context
  private detectPortugueseIntent(query: string): AuthenticContextualImageRequest['intent'] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('como') || queryLower.includes('fazer')) return 'como_fazer';
    if (queryLower.includes('erro') || queryLower.includes('problema')) return 'solucao_problema';
    if (queryLower.includes('o que é') || queryLower.includes('que é')) return 'o_que_e';
    if (queryLower.includes('motivação') || queryLower.includes('desanimado')) return 'motivacao';
    if (queryLower.includes('consegui') || queryLower.includes('completei')) return 'celebracao';
    
    return 'orientacao';
  }

  private getCurrentBrazilianTimeContext(): AuthenticContextualImageRequest['timeOfDay'] {
    // Adjust for Brazilian timezone context
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) return 'manha';
    if (hour >= 12 && hour < 18) return 'tarde';
    if (hour >= 18 && hour < 23) return 'noite';
    return 'madrugada';
  }

  private detectRitualContext(query: string): AuthenticContextualImageRequest['ritualContext'] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('ritual matinal') || queryLower.includes('manhã')) return 'matinal';
    if (queryLower.includes('ritual noturno') || queryLower.includes('noite')) return 'noturno';
    if (queryLower.includes('flow') || queryLower.includes('foco')) return 'flow';
    
    return 'none';
  }

  private getAppropriateTonesForLevel(level: number): AuthenticContextualImageRequest['emotionalTone'][] {
    // Different levels respond better to different emotional approaches
    const toneMap = {
      1: ['encorajador', 'compassivo'], // O Despertar needs encouragement
      2: ['energetico', 'encorajador'], // A Ruptura needs energy for change
      3: ['serio', 'focado'], // O Chamado needs warrior focus
      4: ['focado', 'serio'], // A Descoberta needs strategic focus
      5: ['compassivo', 'serio'], // O Discernimento needs wisdom
      6: ['celebrativo', 'energetico'], // A Ascensão celebrates mastery
      7: ['celebrativo', 'encorajador'] // A Lenda inspires others
    };
    
    return toneMap[level as keyof typeof toneMap] || ['encorajador'];
  }

  private determineUserLevel(recentActivity: any[]): number {
    // Analyze activity to determine current Modo Caverna level
    // This would integrate with actual user progress tracking
    return 1; // Default to O Despertar
  }

  private analyzeChallengeProgress(recentActivity: any[]): any {
    // Analyze 40-day challenge progress
    return { current_day: 0, consistency: 0, momentum: 'building' };
  }

  private analyzeRitualConsistency(recentActivity: any[]): any {
    // Analyze ritual completion consistency
    return { morning_consistency: 0, evening_consistency: 0, overall_score: 0 };
  }

  private analyzePhilosophyAlignment(recentActivity: any[]): any {
    // Analyze alignment with PROPÓSITO > FOCO > PROGRESSO
    return { proposito_clarity: 0, foco_consistency: 0, progresso_visible: 0 };
  }

  private recommendCaptainMood(level: number, challengeProgress: any, ritualConsistency: any): string {
    // Recommend appropriate Captain Caverna mood based on user context
    const levelConfig = AUTHENTIC_LEVEL_CHARACTERISTICS[level];
    return levelConfig.captain_mood;
  }

  private findBestAuthenticMatch(available: string[], preferences: string[]): string | undefined {
    for (const pref of preferences) {
      const match = available.find(item => 
        item.includes(pref) || 
        pref.includes(item) ||
        this.isSemanticMatch(item, pref)
      );
      if (match) return match;
    }
    return undefined;
  }

  private isSemanticMatch(item: string, preference: string): boolean {
    // Semantic matching for Portuguese terms
    const semanticMap: Record<string, string[]> = {
      'ensinando': ['teaching', 'guiando', 'orientando'],
      'guerreiro': ['warrior', 'lutador', 'combatente'],
      'sabio': ['wise', 'inteligente', 'conhecedor'],
      'lenda': ['legend', 'mitico', 'inspirador']
    };
    
    const itemSynonyms = semanticMap[item] || [];
    const prefSynonyms = semanticMap[preference] || [];
    
    return itemSynonyms.includes(preference) || prefSynonyms.includes(item);
  }
}

