import { ImageGenerationParams } from './types';

export interface ContextualImageRequest {
  query: string;
  intent: 'how_to' | 'troubleshooting' | 'what_is' | 'motivation' | 'celebration' | 'guidance';
  userLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Official Modo Caverna 7 Levels: Despertar, Ruptura, Chamado, Descoberta, Discernimento, Ascensão, Lenda
  emotionalTone: 'encouraging' | 'serious' | 'celebratory' | 'focused' | 'compassionate' | 'energetic';
  knowledgeCategory: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night';
  userProgress?: 'struggling' | 'progressing' | 'achieving' | 'stagnant';
}

export interface UserEmotionalContext {
  recentActivity: 'struggling' | 'progressing' | 'achieving' | 'stagnant';
  searchPattern: 'help_seeking' | 'exploring' | 'troubleshooting' | 'celebrating';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
  streakStatus: 'building' | 'maintaining' | 'broken' | 'recovering';
  engagementLevel: 'high' | 'medium' | 'low';
}

export interface UserVisualPreferences {
  favoriteCharacterStyles: string[];
  preferredEmotionalTones: string[];
  engagementPatterns: {
    mostViewedImages: string[];
    longestViewTimes: string[];
    mostSharedImages: string[];
  };
  progressMilestones: {
    level: number;
    achievementImages: string[];
    personalizedElements: string[];
  };
}

// Intent-based pose and outfit configurations
const INTENT_CONFIGURATIONS = {
  'how_to': {
    poses: ['teaching', 'pointing', 'demonstrating', 'guiding'],
    outfits: ['guide', 'mentor', 'instructor'],
    props: ['scroll', 'pointer', 'tools'],
    backgrounds: ['cave_classroom', 'tutorial_space']
  },
  'troubleshooting': {
    poses: ['problem_solving', 'thinking', 'analyzing', 'focused'],
    outfits: ['focused', 'technical', 'problem_solver'],
    props: ['magnifying_glass', 'tools', 'diagnostic_equipment'],
    backgrounds: ['workshop', 'analysis_cave']
  },
  'what_is': {
    poses: ['explaining', 'wise', 'contemplative', 'teaching'],
    outfits: ['wise', 'philosopher', 'sage'],
    props: ['book', 'crystal_ball', 'ancient_scroll'],
    backgrounds: ['library_cave', 'wisdom_chamber']
  },
  'motivation': {
    poses: ['encouraging', 'inspiring', 'powerful', 'determined'],
    outfits: ['warrior', 'leader', 'motivator'],
    props: ['flag', 'torch', 'motivational_symbol'],
    backgrounds: ['mountain_peak', 'victory_cave']
  },
  'celebration': {
    poses: ['celebrating', 'victorious', 'proud', 'joyful'],
    outfits: ['ceremonial', 'victory', 'festive'],
    props: ['trophy', 'celebration_items', 'achievement_badge'],
    backgrounds: ['celebration_cave', 'achievement_hall']
  },
  'guidance': {
    poses: ['guiding', 'leading', 'showing_path', 'protective'],
    outfits: ['guide', 'pathfinder', 'protector'],
    props: ['compass', 'map', 'lantern'],
    backgrounds: ['path_cave', 'journey_landscape']
  }
};

// Emotional tone modifiers
const EMOTIONAL_MODIFIERS = {
  'encouraging': {
    lighting: 'warm_bright',
    expression: 'supportive_smile',
    posture: 'open_welcoming',
    colors: ['warm_orange', 'encouraging_yellow']
  },
  'serious': {
    lighting: 'focused_dramatic',
    expression: 'determined_serious',
    posture: 'strong_confident',
    colors: ['deep_red', 'serious_gray']
  },
  'celebratory': {
    lighting: 'bright_festive',
    expression: 'joyful_proud',
    posture: 'victorious_raised',
    colors: ['celebration_gold', 'victory_red']
  },
  'focused': {
    lighting: 'concentrated_spotlight',
    expression: 'intense_focused',
    posture: 'alert_ready',
    colors: ['focus_blue', 'concentration_purple']
  },
  'compassionate': {
    lighting: 'soft_gentle',
    expression: 'understanding_kind',
    posture: 'caring_supportive',
    colors: ['gentle_blue', 'compassionate_green']
  },
  'energetic': {
    lighting: 'dynamic_bright',
    expression: 'excited_energetic',
    posture: 'active_dynamic',
    colors: ['energy_red', 'dynamic_orange']
  }
};

// Level-based character evolution - OFFICIAL MODO CAVERNA LEVELS
const LEVEL_CHARACTERISTICS = {
  1: { // O Despertar (The Awakening) - Inconformado (Nonconformist)
    characterRole: 'guide',
    relationship: 'teacher_student',
    complexity: 'simple',
    elements: ['basic_cave', 'starting_journey', 'awakening_flame'],
    state_of_mind: 'inconformado',
    description: 'Initial discomfort and questioning'
  },
  2: { // A Ruptura (The Rupture) - Explorador (Explorer)
    characterRole: 'mentor',
    relationship: 'mentor_apprentice',
    complexity: 'developing',
    elements: ['exploration_tools', 'breaking_chains', 'discovery_elements'],
    state_of_mind: 'explorador',
    description: 'Breaking old patterns and limitations'
  },
  3: { // O Chamado (The Call) - Guerreiro (Warrior)
    characterRole: 'trainer',
    relationship: 'trainer_warrior',
    complexity: 'intermediate',
    elements: ['warrior_gear', 'strategic_tools', 'battle_preparation'],
    state_of_mind: 'guerreiro',
    description: 'Recognizing patterns and strategic thinking'
  },
  4: { // A Descoberta (The Discovery) - Estrategista (Strategist)
    characterRole: 'advisor',
    relationship: 'advisor_strategist',
    complexity: 'advanced',
    elements: ['strategic_maps', 'planning_elements', 'consistency_tools'],
    state_of_mind: 'estrategista',
    description: 'Understanding consistency and daily practice'
  },
  5: { // O Discernimento (The Discernment) - Sábio (Wise)
    characterRole: 'companion',
    relationship: 'peer_wise',
    complexity: 'sophisticated',
    elements: ['wisdom_artifacts', 'discernment_symbols', 'knowledge_application'],
    state_of_mind: 'sabio',
    description: 'Developing wisdom to apply knowledge'
  },
  6: { // A Ascensão (The Ascension) - Mestre (Master)
    characterRole: 'peer',
    relationship: 'master_master',
    complexity: 'expert',
    elements: ['mastery_symbols', 'ascension_elements', 'self_driven_tools'],
    state_of_mind: 'mestre',
    description: 'Becoming self-driven and unstoppable'
  },
  7: { // A Lenda (The Legend) - Lenda (Legend)
    characterRole: 'fellow_legend',
    relationship: 'legend_legend',
    complexity: 'legendary',
    elements: ['legend_regalia', 'inspiration_symbols', 'transformation_embodiment'],
    state_of_mind: 'lenda',
    description: 'Embodying transformation and inspiring others'
  }
};

// Brazilian cultural elements
const CULTURAL_ELEMENTS = {
  expressions: {
    encouraging: ['sorriso_brasileiro', 'jeitinho_positivo', 'energia_carioca'],
    serious: ['determinacao_nordestina', 'foco_paulista', 'garra_gaucha'],
    celebratory: ['festa_brasileira', 'alegria_carnaval', 'vitoria_futebol'],
    focused: ['concentracao_brasileira', 'foco_determinado', 'atencao_plena'],
    compassionate: ['acolhimento_brasileiro', 'empatia_calorosa', 'compreensao_humana'],
    energetic: ['energia_tropical', 'vitalidade_brasileira', 'dinamismo_carioca']
  },
  props: {
    cultural: ['bandeira_brasil', 'elementos_regionais', 'simbolos_nacionais'],
    motivational: ['frase_motivacional_pt', 'ditado_popular', 'expressao_brasileira']
  },
  backgrounds: {
    regional: ['caverna_amazonica', 'gruta_nordestina', 'caverna_sulista'],
    cultural: ['ambiente_brasileiro', 'cenario_tropical', 'paisagem_nacional']
  }
};

export class ContextualImageEngine {
  private userPreferences: Map<string, UserVisualPreferences> = new Map();

  /**
   * Generate contextual image parameters based on user query and context
   */
  generateContextualImage(request: ContextualImageRequest, userId?: string): ImageGenerationParams {
    // Get base configuration from intent
    const baseConfig = this.getIntentConfiguration(request.intent);
    
    // Apply emotional tone modifiers
    const emotionalConfig = this.applyEmotionalTone(request.emotionalTone);
    
    // Add level-based characteristics
    const levelConfig = this.getLevelCharacteristics(request.userLevel || 1);
    
    // Integrate cultural elements
    const culturalConfig = this.addCulturalElements(request);
    
    // Apply user preferences if available
    const personalizedConfig = userId ? this.applyPersonalization(userId, baseConfig) : baseConfig;
    
    // Combine all configurations
    return this.combineConfigurations(
      personalizedConfig,
      emotionalConfig,
      levelConfig,
      culturalConfig,
      request
    );
  }

  /**
   * Analyze user's emotional context from their activity
   */
  analyzeUserEmotionalContext(userId: string, recentActivity: any[]): UserEmotionalContext {
    // Analyze recent search patterns
    const searchPattern = this.analyzeSearchPatterns(recentActivity);
    
    // Determine current time context
    const timeOfDay = this.getCurrentTimeContext();
    
    // Assess user progress
    const recentProgress = this.assessRecentProgress(recentActivity);
    
    // Check streak status
    const streakStatus = this.checkStreakStatus(userId, recentActivity);
    
    // Measure engagement level
    const engagementLevel = this.measureEngagementLevel(recentActivity);

    return {
      recentActivity: recentProgress,
      searchPattern,
      timeOfDay,
      streakStatus,
      engagementLevel
    };
  }

  /**
   * Learn from user interactions to improve personalization
   */
  learnFromInteraction(userId: string, imageId: string, interaction: {
    viewTime: number;
    liked: boolean;
    shared: boolean;
    clicked: boolean;
  }) {
    const preferences = this.userPreferences.get(userId) || this.createDefaultPreferences();
    
    // Update engagement patterns
    if (interaction.viewTime > 5000) { // 5+ seconds
      preferences.engagementPatterns.longestViewTimes.push(imageId);
    }
    
    if (interaction.shared) {
      preferences.engagementPatterns.mostSharedImages.push(imageId);
    }
    
    if (interaction.liked || interaction.viewTime > 3000) {
      preferences.engagementPatterns.mostViewedImages.push(imageId);
    }
    
    // Extract style preferences from liked images
    if (interaction.liked) {
      const imageStyle = this.extractImageStyle(imageId);
      if (imageStyle && !preferences.favoriteCharacterStyles.includes(imageStyle)) {
        preferences.favoriteCharacterStyles.push(imageStyle);
      }
    }
    
    this.userPreferences.set(userId, preferences);
  }

  /**
   * Get smart suggestions for image generation based on context
   */
  getSmartSuggestions(query: string, category: string): ContextualImageRequest[] {
    const suggestions: ContextualImageRequest[] = [];
    
    // Analyze query for intent
    const detectedIntent = this.detectQueryIntent(query);
    
    // Generate multiple contextual options
    const emotionalTones: Array<ContextualImageRequest['emotionalTone']> = 
      ['encouraging', 'focused', 'energetic'];
    
    emotionalTones.forEach(tone => {
      suggestions.push({
        query,
        intent: detectedIntent,
        emotionalTone: tone,
        knowledgeCategory: category,
        timeOfDay: this.getCurrentTimeContext()
      });
    });
    
    return suggestions;
  }

  // Private helper methods
  private getIntentConfiguration(intent: ContextualImageRequest['intent']) {
    return INTENT_CONFIGURATIONS[intent] || INTENT_CONFIGURATIONS['guidance'];
  }

  private applyEmotionalTone(tone: ContextualImageRequest['emotionalTone']) {
    return EMOTIONAL_MODIFIERS[tone] || EMOTIONAL_MODIFIERS['encouraging'];
  }

  private getLevelCharacteristics(level: number) {
    return LEVEL_CHARACTERISTICS[level as keyof typeof LEVEL_CHARACTERISTICS] || LEVEL_CHARACTERISTICS[1];
  }

  private addCulturalElements(request: ContextualImageRequest) {
    // Add Brazilian cultural elements based on context
    const cultural = CULTURAL_ELEMENTS;
    
    return {
      expressions: cultural.expressions[request.emotionalTone] || cultural.expressions.encouraging,
      props: cultural.props.cultural,
      backgrounds: cultural.backgrounds.cultural
    };
  }

  private applyPersonalization(userId: string, baseConfig: any) {
    // Note: userId parameter kept for future personalization features
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return baseConfig;
    
    // Modify base config based on user preferences
    const personalizedConfig = { ...baseConfig };
    
    // Apply favorite styles
    if (preferences.favoriteCharacterStyles.length > 0) {
      personalizedConfig.preferredStyles = preferences.favoriteCharacterStyles;
    }
    
    return personalizedConfig;
  }

  private combineConfigurations(
    baseConfig: any,
    emotionalConfig: any,
    levelConfig: any,
    culturalConfig: any,
    request: ContextualImageRequest
  ): ImageGenerationParams {
    // Intelligent selection based on all factors
    const pose = this.selectOptimalPose(baseConfig, emotionalConfig, levelConfig);
    const outfit = this.selectOptimalOutfit(baseConfig, levelConfig, request);
    const footwear = this.selectOptimalFootwear(outfit, levelConfig);
    const prop = this.selectOptimalProp(baseConfig, culturalConfig, request);
    
    return {
      pose,
      outfit,
      footwear,
      prop,
      frameType: this.determineFrameType(request),
      frameId: this.generateFrameId(request)
    };
  }

  private selectOptimalPose(baseConfig: any, emotionalConfig: any, levelConfig: any): string {
    // Smart pose selection based on multiple factors
    const availablePoses = baseConfig.poses || ['default'];
    const emotionalPreference = emotionalConfig.posture;
    const levelRole = levelConfig.characterRole;
    
    // Priority: emotional tone > level role > base intent
    return this.findBestMatch(availablePoses, [emotionalPreference, levelRole]) || availablePoses[0];
  }

  private selectOptimalOutfit(baseConfig: any, levelConfig: any, request: ContextualImageRequest): string {
    const availableOutfits = baseConfig.outfits || ['default'];
    const levelRole = levelConfig.characterRole;
    const userLevel = request.userLevel || 1;
    // Note: stateOfMind available for future character expression features
    
    // Official Modo Caverna level progression
    if (userLevel >= 6) { // A Ascensão (6) & A Lenda (7) - Mestre & Lenda
      return this.findBestMatch(availableOutfits, ['mestre', 'lenda', 'legend', levelRole]) || availableOutfits[0];
    } else if (userLevel >= 4) { // A Descoberta (4) & O Discernimento (5) - Estrategista & Sábio
      return this.findBestMatch(availableOutfits, ['estrategista', 'sabio', 'wise', 'strategist', levelRole]) || availableOutfits[0];
    } else if (userLevel >= 3) { // O Chamado (3) - Guerreiro
      return this.findBestMatch(availableOutfits, ['guerreiro', 'warrior', 'trainer', levelRole]) || availableOutfits[0];
    } else if (userLevel >= 2) { // A Ruptura (2) - Explorador
      return this.findBestMatch(availableOutfits, ['explorador', 'explorer', 'mentor', levelRole]) || availableOutfits[0];
    } else { // O Despertar (1) - Inconformado
      return this.findBestMatch(availableOutfits, ['inconformado', 'guide', 'mentor', levelRole]) || availableOutfits[0];
    }
  }

  private selectOptimalFootwear(outfit: string, levelConfig: any): string {
    // Match footwear to outfit and level - Official Modo Caverna progression
    const levelComplexity = levelConfig.complexity;
    // Note: stateOfMind available for future character expression features
    
    switch (levelComplexity) {
      case 'legendary': return 'lenda_boots'; // A Lenda
      case 'expert': return 'mestre_boots'; // A Ascensão
      case 'sophisticated': return 'sabio_boots'; // O Discernimento
      case 'advanced': return 'estrategista_boots'; // A Descoberta
      case 'intermediate': return 'guerreiro_boots'; // O Chamado
      case 'developing': return 'explorador_boots'; // A Ruptura
      default: return 'inconformado_boots'; // O Despertar
    }
  }

  private selectOptimalProp(baseConfig: any, culturalConfig: any, request: ContextualImageRequest): string | undefined {
    const availableProps = baseConfig.props || [];
    const culturalProps = culturalConfig.props || [];
    
    // Combine intent-based and cultural props
    const allProps = [...availableProps, ...culturalProps];
    
    // Select based on intent and cultural relevance
    if (request.intent === 'motivation') {
      return this.findBestMatch(allProps, ['flag', 'torch', 'frase_motivacional_pt']);
    } else if (request.intent === 'celebration') {
      return this.findBestMatch(allProps, ['trophy', 'festa_brasileira', 'achievement_badge']);
    }
    
    return allProps.length > 0 ? allProps[0] : undefined;
  }

  private determineFrameType(request: ContextualImageRequest): 'standard' | 'onboarding' | 'sequence' {
    // Determine frame type based on context - Official Modo Caverna levels
    if (request.userLevel && request.userLevel <= 2) { // O Despertar & A Ruptura
      return 'onboarding';
    } else if (request.intent === 'how_to') {
      return 'sequence';
    } else {
      return 'standard';
    }
  }

  private generateFrameId(request: ContextualImageRequest): string | undefined {
    const frameType = this.determineFrameType(request);
    
    if (frameType === 'onboarding') {
      // Map to official level names
      const levelNames = ['despertar', 'ruptura', 'chamado', 'descoberta', 'discernimento', 'ascensao', 'lenda'];
      const levelName = levelNames[(request.userLevel || 1) - 1];
      return `onboard_${levelName}_${request.userLevel || 1}`;
    } else if (frameType === 'sequence') {
      return `seq_${request.intent}_01`;
    }
    
    return undefined;
  }

  // Utility methods
  private findBestMatch(available: string[], preferences: string[]): string | undefined {
    for (const pref of preferences) {
      const match = available.find(item => item.includes(pref) || pref.includes(item));
      if (match) return match;
    }
    return undefined;
  }

  private analyzeSearchPatterns(activity: any[]): UserEmotionalContext['searchPattern'] {
    // Analyze recent search activity to determine pattern
    const recentQueries = activity.filter(a => a.type === 'search').slice(0, 10);
    
    const helpKeywords = ['como', 'help', 'ajuda', 'não consigo'];
    const troubleKeywords = ['erro', 'problema', 'bug', 'não funciona'];
    const celebrationKeywords = ['consegui', 'completei', 'terminei', 'sucesso'];
    
    const helpCount = recentQueries.filter(q => 
      helpKeywords.some(keyword => q.query?.toLowerCase().includes(keyword))
    ).length;
    
    const troubleCount = recentQueries.filter(q => 
      troubleKeywords.some(keyword => q.query?.toLowerCase().includes(keyword))
    ).length;
    
    const celebrationCount = recentQueries.filter(q => 
      celebrationKeywords.some(keyword => q.query?.toLowerCase().includes(keyword))
    ).length;
    
    if (celebrationCount > 0) return 'celebrating';
    if (troubleCount > helpCount) return 'troubleshooting';
    if (helpCount > 0) return 'help_seeking';
    return 'exploring';
  }

  private getCurrentTimeContext(): UserEmotionalContext['timeOfDay'] {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'late_night';
  }

  private assessRecentProgress(activity: any[]): UserEmotionalContext['recentActivity'] {
    // Analyze recent activity to assess progress
    const recentActions = activity.slice(0, 20);
    const completions = recentActions.filter(a => a.type === 'completion').length;
    const struggles = recentActions.filter(a => a.type === 'help_request').length;
    const achievements = recentActions.filter(a => a.type === 'achievement').length;
    
    if (achievements > 0) return 'achieving';
    if (completions > struggles) return 'progressing';
    if (struggles > completions) return 'struggling';
    return 'stagnant';
  }

  private checkStreakStatus(userId: string, activity: any[]): UserEmotionalContext['streakStatus'] {
    // Check user's streak status from recent activity
    // This would integrate with actual streak tracking system
    const recentDays = 7;
    const dailyActivity = this.groupActivityByDay(activity, recentDays);
    
    const activeDays = Object.keys(dailyActivity).length;
    
    if (activeDays >= recentDays) return 'maintaining';
    if (activeDays >= recentDays * 0.7) return 'building';
    if (activeDays >= recentDays * 0.3) return 'recovering';
    return 'broken';
  }

  private measureEngagementLevel(activity: any[]): UserEmotionalContext['engagementLevel'] {
    const recentActivity = activity.slice(0, 50);
    const engagementScore = recentActivity.reduce((score, action) => {
      switch (action.type) {
        case 'search': return score + 1;
        case 'completion': return score + 3;
        case 'achievement': return score + 5;
        case 'sharing': return score + 4;
        case 'feedback': return score + 2;
        default: return score;
      }
    }, 0);
    
    if (engagementScore >= 50) return 'high';
    if (engagementScore >= 20) return 'medium';
    return 'low';
  }

  private groupActivityByDay(activity: any[], days: number): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    activity.forEach(action => {
      const actionDate = new Date(action.timestamp);
      if (actionDate >= cutoffDate) {
        const dayKey = actionDate.toISOString().split('T')[0];
        if (!grouped[dayKey]) grouped[dayKey] = [];
        grouped[dayKey].push(action);
      }
    });
    
    return grouped;
  }

  private detectQueryIntent(query: string): ContextualImageRequest['intent'] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('como') || queryLower.includes('how')) return 'how_to';
    if (queryLower.includes('erro') || queryLower.includes('problema')) return 'troubleshooting';
    if (queryLower.includes('o que é') || queryLower.includes('what is')) return 'what_is';
    if (queryLower.includes('motivação') || queryLower.includes('desanimado')) return 'motivation';
    if (queryLower.includes('consegui') || queryLower.includes('completei')) return 'celebration';
    
    return 'guidance';
  }

  private createDefaultPreferences(): UserVisualPreferences {
    return {
      favoriteCharacterStyles: [],
      preferredEmotionalTones: ['encouraging'],
      engagementPatterns: {
        mostViewedImages: [],
        longestViewTimes: [],
        mostSharedImages: []
      },
      progressMilestones: {
        level: 1,
        achievementImages: [],
        personalizedElements: []
      }
    };
  }

  private extractImageStyle(imageId: string): string | undefined {
    // Extract style characteristics from image ID or metadata
    // This would integrate with actual image metadata system
    return undefined;
  }
}

