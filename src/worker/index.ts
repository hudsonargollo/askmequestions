import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { getCookie } from "hono/cookie";
import OpenAI from 'openai';
import { 
  SearchRequestSchema,
  ImageGenerationRequestSchema,
  type ImageGenerationResponse,
  type GeneratedImageRecord
} from '../shared/types';
import { EnhancedSearchEngine, type SearchRequest } from '../shared/enhancedSearch';
import { KnowledgeDataSeeder } from '../shared/knowledgeDataSeeder';
import { CorrectedKnowledgeSeeder } from '../shared/correctedKnowledgeSeeder';
import { ContextualImageEngine, type ContextualImageRequest } from '../shared/contextualImageEngine';
import { FileService } from './fileService';
import { 
  authMiddleware, 
  createSession, 
  deleteSession, 
  setAuthCookie, 
  clearAuthCookie,
  AUTH_COOKIE_NAME,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  type User 
} from '../shared/auth';
import { PromptTemplateEngineImpl } from '../shared/promptTemplateEngineImpl';
import { AssetStorageManager } from '../shared/assetStorageManager';
import { DatabaseLayer, DatabaseConnection } from '../shared/database';
import { createHealthCheckHandler, createMetricsHandler } from '../shared/productionMonitoring';
import { createSecurityMiddleware, SecurityManager } from '../shared/securityManager';

type Variables = {
  user: User;
};

// Helper function to check if image services are available
function isImageServiceAvailable(env: any): boolean {
  return !!(env.IMAGE_DB && env.IMAGE_BUCKET);
}

// Helper function to return image service unavailable error
function imageServiceUnavailableResponse() {
  return Response.json({
    success: false,
    error: 'Image generation service is not configured. Please contact administrator.',
    code: 'IMAGE_SERVICE_UNAVAILABLE'
  }, { status: 503 });
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply security middleware to all routes
app.use('*', async (c, next) => {
  const securityMiddleware = createSecurityMiddleware(c.env);
  return await securityMiddleware(c, next);
});

// Initialize the knowledge base with Modo Caverna documentation
const KNOWLEDGE_BASE = [
  {
    feature_module: "Authentication",
    functionality: "User Login",
    description: "Allows existing users to sign in.",
    ui_elements: "E-mail field, Senha field, Acessar button",
    user_questions_en: "How do I log in?",
    user_questions_pt: "Como eu faço login?",
    category: "authentication",
    content_text: "User login functionality allows existing users to sign in using their email and password. The interface includes email field, password field (Senha), and access button (Acessar)."
  },
  {
    feature_module: "Authentication",
    functionality: "Persistent Session",
    description: "Option to remain logged in.",
    ui_elements: "Mantenha-me conectado checkbox",
    user_questions_en: "Can the system remember my login?",
    user_questions_pt: "O sistema pode lembrar meu login?",
    category: "authentication",
    content_text: "The system provides a persistent session option through the 'Mantenha-me conectado' (Keep me logged in) checkbox, allowing users to stay logged in between sessions."
  },
  {
    feature_module: "Authentication",
    functionality: "Password Recovery",
    description: "Process to reset a forgotten password.",
    ui_elements: "Esqueceu a senha? link",
    user_questions_en: "What if I forget my password?",
    user_questions_pt: "O que eu faço se esquecer minha senha?",
    category: "authentication",
    content_text: "Password recovery process is available through the 'Esqueceu a senha?' (Forgot password?) link, allowing users to reset their forgotten passwords."
  },
  {
    feature_module: "Authentication",
    functionality: "User Registration",
    description: "Link to the sign-up page for new users.",
    ui_elements: "Não possui uma conta? Cadastre-se link",
    user_questions_en: "How do I create an account?",
    user_questions_pt: "Como eu crio uma conta nova?",
    category: "authentication",
    content_text: "New users can create accounts through the 'Não possui uma conta? Cadastre-se' (Don't have an account? Sign up) link."
  },
  {
    feature_module: "Onboarding",
    functionality: "Welcome Screen",
    description: "First screen for new users.",
    ui_elements: "Seja bem-vindo(a) à Caverna title",
    user_questions_en: "What's the first screen I see?",
    user_questions_pt: "Qual a primeira tela que vejo?",
    category: "onboarding",
    content_text: "The welcome screen greets new users with 'Seja bem-vindo(a) à Caverna' (Welcome to the Cave) and serves as the entry point to the system."
  },
  {
    feature_module: "Onboarding",
    functionality: "AI Assistant Setup",
    description: "Requests user's WhatsApp number for an AI assistant.",
    ui_elements: "Seu WhatsApp number field",
    user_questions_en: "What is the AI assistant?",
    user_questions_pt: "O que é o assistente de IA?",
    category: "onboarding",
    content_text: "During onboarding, users can set up an AI assistant by providing their WhatsApp number in the 'Seu WhatsApp' field."
  },
  {
    feature_module: "Onboarding",
    functionality: "Video Tour",
    description: "Offers a short video tour of the system.",
    ui_elements: "Começar o Tour button",
    user_questions_en: "Is there a tutorial video?",
    user_questions_pt: "Existe um vídeo de tutorial?",
    category: "onboarding",
    content_text: "New users can access a video tour of the system through the 'Começar o Tour' (Start the Tour) button."
  },
  {
    feature_module: "Dashboard",
    functionality: "Main View (Central Caverna)",
    description: "The main user dashboard with overview widgets.",
    ui_elements: "Navigation Tabs, various widgets",
    user_questions_en: "What's on the main screen?",
    user_questions_pt: "O que tem na tela principal?",
    category: "dashboard",
    content_text: "The Central Caverna is the main dashboard featuring navigation tabs and various widgets providing an overview of user activities and progress."
  },
  {
    feature_module: "Dashboard",
    functionality: "Consecutive Day Tracker",
    description: "Tracks and displays the user's login streak.",
    ui_elements: "Você está há X dia consecutivo widget",
    user_questions_en: "How can I see my streak?",
    user_questions_pt: "Como posso ver minha sequência de dias?",
    category: "dashboard",
    content_text: "The consecutive day tracker displays your login streak with the 'Você está há X dia consecutivo' (You are on X consecutive days) widget."
  },
  {
    feature_module: "Rituals",
    functionality: "Rituals Calculator",
    description: "Automatically sets up morning/night rituals based on user schedule.",
    ui_elements: "Calculadora de Rituais, time input fields",
    user_questions_en: "How does the rituals calculator work?",
    user_questions_pt: "Como funciona a calculadora de rituais?",
    category: "rituals",
    content_text: "The Calculadora de Rituais (Rituals Calculator) automatically sets up morning and night rituals based on your schedule using time input fields."
  },
  {
    feature_module: "Rituals",
    functionality: "Edit Rituals",
    description: "Allows manual editing of existing rituals.",
    ui_elements: "EDITAR RITUAIS modal",
    user_questions_en: "How can I change my rituals?",
    user_questions_pt: "Como posso alterar meus rituais?",
    category: "rituals",
    content_text: "You can manually edit existing rituals through the 'EDITAR RITUAIS' (EDIT RITUALS) modal interface."
  },
  {
    feature_module: "Cave Challenge",
    functionality: "Challenge Welcome Screen",
    description: "Entry point for the 40-day challenge.",
    ui_elements: "Desafio Caverna, Eu aceito o desafio button",
    user_questions_en: "How do I start the challenge?",
    user_questions_pt: "Como eu começo o desafio?",
    category: "challenges",
    content_text: "The Cave Challenge begins at the welcome screen with 'Desafio Caverna' title and 'Eu aceito o desafio' (I accept the challenge) button."
  },
  {
    feature_module: "Cave Challenge",
    functionality: "7-Step Setup Process",
    description: "Guides the user through defining goals, habits to eliminate/create, etc.",
    ui_elements: "Multi-step modals with progress bars",
    user_questions_en: "What do I need to do to set up the challenge?",
    user_questions_pt: "O que preciso fazer para configurar o desafio?",
    category: "challenges",
    content_text: "The challenge setup involves a 7-step process with multi-step modals and progress bars to guide you through defining goals and habits."
  },
  {
    feature_module: "Cave Challenge",
    functionality: "Challenge Tracking Screen",
    description: "Main interface for the 40-day challenge with a calendar grid and checklists.",
    ui_elements: "40-day grid, NOVOS HÁBITOS/RENÚNCIAS checklists",
    user_questions_en: "Where do I track my daily progress?",
    user_questions_pt: "Onde eu acompanho meu progresso diário?",
    category: "challenges",
    content_text: "Track daily progress on the challenge tracking screen featuring a 40-day grid and checklists for 'NOVOS HÁBITOS' (NEW HABITS) and 'RENÚNCIAS' (RENUNCIATIONS)."
  },
  {
    feature_module: "Agenda",
    functionality: "Main Calendar View",
    description: "Full-screen calendar with daily and weekly views.",
    ui_elements: "Agenda button, Semanal/Diária toggle",
    user_questions_en: "How can I see my schedule for the week?",
    user_questions_pt: "Como posso ver minha agenda da semana?",
    category: "calendar",
    content_text: "Access your schedule through the Agenda button with toggle options for 'Semanal' (Weekly) and 'Diária' (Daily) views."
  },
  {
    feature_module: "Agenda",
    functionality: "Add New Appointment",
    description: "Modal to create a new event with title, description, and time.",
    ui_elements: "+ Novo compromisso button",
    user_questions_en: "How do I add an event to my calendar?",
    user_questions_pt: "Como eu adiciono um novo evento ao meu calendário?",
    category: "calendar",
    content_text: "Create new events using the '+ Novo compromisso' (+ New appointment) button, which opens a modal for title, description, and time."
  },
  {
    feature_module: "Agenda",
    functionality: "Google Calendar Integration",
    description: "Allows syncing the platform's agenda with a Google Calendar.",
    ui_elements: "Integrar ao Google Calendar button",
    user_questions_en: "Can I sync this with my Google Calendar?",
    user_questions_pt: "Posso sincronizar com o Google Calendar?",
    category: "calendar",
    content_text: "Sync your agenda with Google Calendar using the 'Integrar ao Google Calendar' (Integrate with Google Calendar) button."
  },
  {
    feature_module: "Community",
    functionality: "Main Feed (Comunidade Alcatéia)",
    description: "The central hub of the community with a feed of user posts.",
    ui_elements: "Início tab, Post creation box, Post feed",
    user_questions_en: "Where can I talk to other users?",
    user_questions_pt: "Onde posso falar com outros usuários?",
    category: "community",
    content_text: "Connect with other users in the Comunidade Alcatéia (Wolf Pack Community) through the main feed accessible via the 'Início' (Home) tab."
  },
  {
    feature_module: "Knowledge",
    functionality: "Personal Library (Minhas leituras)",
    description: "A user's personal library of books and articles.",
    ui_elements: "Minhas leituras title, + Novo button",
    user_questions_en: "Where can I manage my reading list?",
    user_questions_pt: "Onde posso gerenciar minha lista de leitura?",
    category: "knowledge",
    content_text: "Manage your personal library in 'Minhas leituras' (My readings) section with the '+ Novo' (+ New) button to add books and articles."
  },
  {
    feature_module: "Courses",
    functionality: "Course Content Page",
    description: "Main page for a course with a video player and syllabus.",
    ui_elements: "Video player, Module list",
    user_questions_en: "How do I watch a course lesson?",
    user_questions_pt: "Como assisto a uma aula do curso?",
    category: "courses",
    content_text: "Watch course lessons using the video player and navigate through the module list on the course content page."
  },
  {
    feature_module: "User Profile",
    functionality: "Account Information Page",
    description: "Page to view and edit personal information and manage password.",
    ui_elements: "Informações da conta tab",
    user_questions_en: "How do I change my name or email?",
    user_questions_pt: "Como altero meu nome ou e-mail?",
    category: "profile",
    content_text: "Edit personal information and manage your password in the 'Informações da conta' (Account information) tab."
  },
  {
    feature_module: "Notes",
    functionality: "Main Notes Interface",
    description: "Note-taking feature with folders and a rich text editor.",
    ui_elements: "Folder list, Text editor toolbar",
    user_questions_en: "How do I take notes in the app?",
    user_questions_pt: "Como eu faço anotações no aplicativo?",
    category: "productivity",
    content_text: "Take notes using the notes interface with folder organization and rich text editor toolbar."
  },
  {
    feature_module: "Finances",
    functionality: "Main Finance Dashboard",
    description: "Overview of financial accounts, charts, and transaction summaries.",
    ui_elements: "Minha carteira widget, Bar chart",
    user_questions_en: "Where can I manage my finances?",
    user_questions_pt: "Onde posso gerenciar minhas finanças?",
    category: "finances",
    content_text: "Manage your finances through the main dashboard featuring 'Minha carteira' (My wallet) widget and bar charts for transaction summaries."
  },
  {
    feature_module: "Productivity Flow",
    functionality: "Productivity Flow Dashboard",
    description: "A dedicated screen with a Pomodoro timer, Kanban board, and focus music.",
    ui_elements: "POMODORO timer, Quadro de tarefas",
    user_questions_en: "What is the Productivity Flow?",
    user_questions_pt: "O que é o Flow de Produtividade?",
    category: "productivity",
    content_text: "The Productivity Flow dashboard includes a POMODORO timer, 'Quadro de tarefas' (Task board), and focus music for enhanced productivity."
  },
  {
    feature_module: "Forge",
    functionality: "Main Workout/Shape Screen",
    description: "Dashboard for physical stats, body measurements, and workout schedule.",
    ui_elements: "Registro de Shape, Organize seus treinos",
    user_questions_en: "Where do I track my workouts?",
    user_questions_pt: "Onde eu registro meus treinos?",
    category: "fitness",
    content_text: "Track workouts and physical stats in the Forge section with 'Registro de Shape' (Shape record) and 'Organize seus treinos' (Organize your workouts)."
  },
  {
    feature_module: "Forge",
    functionality: "4-Step Setup Process",
    description: "Onboarding for the Forge to set BMI, measurements, and physical goals.",
    ui_elements: "Multi-step modals with progress bars",
    user_questions_en: "How do I calculate my BMI?",
    user_questions_pt: "Como calculo meu IMC?",
    category: "fitness",
    content_text: "Complete the 4-step Forge setup process using multi-step modals to set BMI, measurements, and physical goals."
  },
  {
    feature_module: "Forge",
    functionality: "Create Meal Plan",
    description: "Feature to log meals, including specific foods and supplements.",
    ui_elements: "Controle semanal de refeições, + Nova refeição button",
    user_questions_en: "How do I log a meal like lunch or dinner?",
    user_questions_pt: "Como eu registro uma refeição como almoço ou jantar?",
    category: "fitness",
    content_text: "Log meals using 'Controle semanal de refeições' (Weekly meal control) and '+ Nova refeição' (+ New meal) button for specific foods and supplements."
  },
  {
    feature_module: "Goals (Metas)",
    functionality: "Main Goals Dashboard",
    description: "A central screen for setting a main objective and categorized life goals.",
    ui_elements: "Objetivo principal, Minhas metas para [ano] boards",
    user_questions_en: "Where can I set my life goals?",
    user_questions_pt: "Onde posso definir minhas metas de vida?",
    category: "goals",
    content_text: "Set life goals on the main goals dashboard with 'Objetivo principal' (Main objective) and 'Minhas metas para [ano]' (My goals for [year]) boards."
  },
  {
    feature_module: "Manifestation (Lei da Atração)",
    functionality: "Main Manifestation Screen",
    description: "A tool with a vision board and a feature to write letters to the future.",
    ui_elements: "+ Adicionar imagem button, + Nova Carta button",
    user_questions_en: "What is the Law of Attraction feature?",
    user_questions_pt: "O que é a funcionalidade Lei da Atração?",
    category: "manifestation",
    content_text: "Use the Law of Attraction tools including vision board with '+ Adicionar imagem' (+ Add image) and '+ Nova Carta' (+ New Letter) for future letters."
  },
  {
    feature_module: "Refer & Earn (Indique & Ganhe)",
    functionality: "Affiliate Dashboard",
    description: "Main dashboard for the referral program with metrics and resources.",
    ui_elements: "Métricas Afiliação, Quick access tiles",
    user_questions_en: "How does the refer and earn program work?",
    user_questions_pt: "Como funciona o programa indique e ganhe?",
    category: "referral",
    content_text: "Access the referral program through the affiliate dashboard featuring 'Métricas Afiliação' (Affiliate metrics) and quick access tiles."
  }
];

// Populate database endpoint (public - no auth required)
app.all('/api/populate-db', async (c) => {
  const db = c.env.DB;

  // Clear existing entries
  await db.prepare('DELETE FROM knowledge_entries').run();

  // Insert knowledge base entries
  const insertStmt = db.prepare(`
    INSERT INTO knowledge_entries (
      feature_module, functionality, description, ui_elements,
      user_questions_en, user_questions_pt, category, content_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entry of KNOWLEDGE_BASE) {
    await insertStmt.bind(
      entry.feature_module,
      entry.functionality,
      entry.description,
      entry.ui_elements,
      entry.user_questions_en,
      entry.user_questions_pt,
      entry.category,
      entry.content_text
    ).run();
  }

  return c.json({ success: true, entriesCount: KNOWLEDGE_BASE.length });
});

// Seed corrected Modo Caverna knowledge base (public - no auth required for testing)
app.all('/api/seed-corrected-data', async (c) => {
  const db = c.env.DB;
  
  try {
    console.log('Seeding corrected Modo Caverna knowledge base...');
    const seeder = new CorrectedKnowledgeSeeder(db);
    await seeder.seedCorrectedData();
    
    return c.json({ 
      success: true, 
      message: 'Corrected Modo Caverna knowledge base seeded successfully',
      methodology: 'Official 7 Levels: O Despertar, A Ruptura, O Chamado, A Descoberta, O Discernimento, A Ascensão, A Lenda',
      philosophy: 'PROPÓSITO > FOCO > PROGRESSO',
      community: 'Somos uma ALCATEIA DE LOBOS ativando o Modo Caverna'
    });
  } catch (error) {
    console.error('Error seeding corrected data:', error);
    return c.json({ error: 'Failed to seed corrected data', details: error.message }, 500);
  }
});

// Enhanced data seeding endpoint (public - no auth required)
app.all('/api/seed-enhanced-data', async (c) => {
  const db = c.env.DB;

  try {
    // Run database migrations first
    console.log('Running database migrations...');
    
    // Check if migrations table exists
    const migrationsExist = await db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
    `).first();

    if (!migrationsExist) {
      // Create migrations table
      await db.prepare(`
        CREATE TABLE migrations (
          id TEXT PRIMARY KEY,
          description TEXT,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }

    // Check if migration already ran
    const migrationExists = await db.prepare(`
      SELECT id FROM migrations WHERE id = '001_enhanced_knowledge_base'
    `).first();

    if (!migrationExists) {
      // Add new columns to knowledge_entries if they don't exist
      const columns = [
        'subcategory TEXT',
        'difficulty_level TEXT DEFAULT "basico"',
        'estimated_time INTEGER DEFAULT 5',
        'prerequisites TEXT',
        'related_features TEXT',
        'tags TEXT',
        'use_cases TEXT',
        'troubleshooting TEXT',
        'quick_action TEXT',
        'step_by_step_guide TEXT',
        'real_world_examples TEXT',
        'advanced_tips TEXT',
        'ui_elements_pt TEXT',
        'philosophy_integration TEXT',
        'user_rating REAL DEFAULT 0',
        'popularity_score INTEGER DEFAULT 0',
        'last_updated DATETIME DEFAULT CURRENT_TIMESTAMP',
        'is_active BOOLEAN DEFAULT true'
      ];

      for (const column of columns) {
        try {
          await db.prepare(`ALTER TABLE knowledge_entries ADD COLUMN ${column}`).run();
        } catch (error) {
          // Column might already exist, continue
          console.log(`Column might already exist: ${column}`);
        }
      }

      // Create analytics tables
      await db.prepare(`
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
          search_type TEXT,
          filters_used TEXT,
          intent_detected TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS knowledge_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          knowledge_entry_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          helpful BOOLEAN,
          comment TEXT,
          feedback_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS search_synonyms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL,
          synonyms TEXT NOT NULL,
          category TEXT,
          language TEXT DEFAULT 'pt',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS search_intent_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT NOT NULL,
          intent_type TEXT NOT NULL,
          response_template TEXT,
          confidence_score REAL DEFAULT 1.0,
          language TEXT DEFAULT 'pt',
          is_active BOOLEAN DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Record migration
      await db.prepare(`
        INSERT INTO migrations (id, description) VALUES 
        ('001_enhanced_knowledge_base', 'Add enhanced fields and analytics tables for knowledge base')
      `).run();
    }

    // Seed enhanced data
    const seeder = new KnowledgeDataSeeder(db);
    await seeder.seedEnhancedData();

    return c.json({ 
      success: true, 
      message: 'Enhanced knowledge base data seeded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced seeding error:', error);
    return c.json({ 
      success: false, 
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Get filter options
app.get('/api/filters', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT DISTINCT category FROM knowledge_entries ORDER BY category').all();
  const categories = result.results.map((row: any) => row.category);
  
  return c.json({ categories });
});

// Enhanced Search endpoint with AI and analytics
app.post('/api/search/enhanced', zValidator('json', SearchRequestSchema), async (c) => {
  const searchRequest = c.req.valid('json');
  const db = c.env.DB;
  
  try {
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });
    
    const searchEngine = new EnhancedSearchEngine(db, openai);
    const imageEngine = new ContextualImageEngine();
    
    // Get user ID if authenticated
    const authCookie = getCookie(c, AUTH_COOKIE_NAME);
    if (authCookie) {
      try {
        const session = await db.prepare('SELECT user_id FROM sessions WHERE id = ?').bind(authCookie).first();
        if (session) {
          searchRequest.user_id = (session as any).user_id;
        }
      } catch (error) {
        console.log('Could not get user from session:', error);
      }
    }
    
    // Perform enhanced search
    const searchResult = await searchEngine.search(searchRequest);
    
    // Generate contextual image if user is authenticated
    let contextualImage = null;
    if (searchRequest.user_id) {
      try {
        // Analyze search context for image generation
        const imageContext: ContextualImageRequest = {
          query: searchRequest.query,
          intent: searchResult.intent as any || 'guidance',
          emotionalTone: 'encouraging', // Default, could be enhanced with sentiment analysis
          knowledgeCategory: searchRequest.category || 'general',
          timeOfDay: getCurrentTimeContext(),
          userProgress: 'progressing' // Could be determined from user activity
        };
        
        // Generate contextual image parameters
        const imageParams = imageEngine.generateContextualImage(imageContext, searchRequest.user_id);
        
        // For now, return the parameters - actual generation would be triggered separately
        contextualImage = {
          suggested_params: imageParams,
          context: imageContext,
          generation_ready: true
        };
      } catch (imageError) {
        console.error('Contextual image generation error:', imageError);
        // Continue without image if generation fails
      }
    }
    
    return c.json({
      ...searchResult,
      contextual_image: contextualImage,
      enhanced_features: {
        personalization: !!searchRequest.user_id,
        contextual_images: !!contextualImage,
        philosophy_integration: true
      }
    });
    
  } catch (error) {
    console.error('Enhanced search error:', error);
    return c.json({ 
      error: 'Enhanced search failed',
      fallback_available: true 
    }, 500);
  }
});

// Helper function for time context
function getCurrentTimeContext(): 'morning' | 'afternoon' | 'evening' | 'late_night' {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'late_night';
}

// Original search endpoint for backward compatibility
app.post('/api/search', zValidator('json', SearchRequestSchema), async (c) => {
  const { query, language = 'pt', category } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    // Enhanced search with better filtering and AI response
    let searchQuery = `
      SELECT 
        id, feature_module, functionality, description, ui_elements,
        user_questions_en, user_questions_pt, category, content_text,
        subcategory, difficulty_level, estimated_time, quick_action,
        ui_elements_pt, troubleshooting, philosophy_integration
      FROM knowledge_entries 
      WHERE is_active = true
    `;
    
    const params: any[] = [];
    
    if (category) {
      searchQuery += ` AND category = ?`;
      params.push(category);
    }
    
    // Enhanced search logic with multiple matching strategies
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(() => `
        (LOWER(feature_module) LIKE ? OR 
         LOWER(functionality) LIKE ? OR 
         LOWER(description) LIKE ? OR 
         LOWER(content_text) LIKE ? OR
         LOWER(user_questions_pt) LIKE ? OR
         LOWER(quick_action) LIKE ?)
      `).join(' AND ');
      
      searchQuery += ` AND (${searchConditions})`;
      
      searchTerms.forEach(term => {
        const searchTerm = `%${term}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      });
    }
    
    searchQuery += ` ORDER BY 
      CASE 
        WHEN LOWER(functionality) LIKE ? THEN 1
        WHEN LOWER(feature_module) LIKE ? THEN 2
        WHEN LOWER(quick_action) LIKE ? THEN 3
        ELSE 4
      END,
      popularity_score DESC,
      user_rating DESC
      LIMIT 10`;
    
    const exactMatch = `%${query.toLowerCase()}%`;
    params.push(exactMatch, exactMatch, exactMatch);

    const response = await db.prepare(searchQuery).bind(...params).all();
    
    if (!response.results || response.results.length === 0) {
      return c.json({
        answer: `Não encontrei informações específicas sobre "${query}" na base de conhecimento. Tente reformular sua pergunta ou use termos mais gerais.`,
        searchResults: { results: [], total_results: 0, response_time_ms: 0 },
        intent: 'not_found',
        suggestions: ['como fazer login', 'desafio caverna', 'configurar rituais']
      });
    }

    // Generate AI response based on found entries
    const context = response.results.slice(0, 3).map((entry: any) => 
      `Funcionalidade: ${entry.feature_module} - ${entry.functionality}\n` +
      `Ação Rápida: ${entry.quick_action}\n` +
      `Elementos da Interface: ${entry.ui_elements_pt ? JSON.parse(entry.ui_elements_pt).join(', ') : entry.ui_elements}\n` +
      `Conteúdo: ${entry.content_text}\n` +
      (entry.troubleshooting ? `Solução de Problemas: ${entry.troubleshooting}\n` : '') +
      (entry.philosophy_integration ? `Filosofia Modo Caverna: ${entry.philosophy_integration}\n` : '')
    ).join('\n---\n');

    const systemPrompt = `Você é o Capitão Caverna, assistente oficial do Modo Caverna, uma plataforma de transformação pessoal. 
    Responda com base na documentação fornecida, mantendo o tom motivacional e a filosofia da "alcatéia" (pack de lobos).
    Use elementos da interface em português e seja prático e direto.
    Se for uma pergunta "como fazer", forneça passos claros.
    Se for um problema, foque nas soluções mais prováveis primeiro.
    Mantenha o espírito de transformação e superação do Modo Caverna.`;

    const userPrompt = `Pergunta: "${query}"\n\nDocumentação do Modo Caverna:\n${context}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const aiAnswer = completion.choices[0].message.content || 
      'Não consegui gerar uma resposta baseada na documentação disponível.';

    return c.json({
      answer: aiAnswer,
      searchResults: searchResponse,
      intent: searchResponse.intent,
      suggestions: searchResponse.suggestions
    });

  } catch (error) {
    console.error('Enhanced search error:', error);
    return c.json({
      answer: 'Ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.',
      searchResults: { results: [], intent: 'error', suggestions: [], total_results: 0, response_time_ms: 0 },
      intent: 'error',
      suggestions: []
    }, 500);
  }
});

// Feedback endpoint
app.post('/api/knowledge/:id/feedback', authMiddleware, async (c) => {
  const knowledgeId = parseInt(c.req.param('id'));
  const { rating, helpful, comment, feedback_type } = await c.req.json();
  const user = c.get('user');
  
  if (!knowledgeId || isNaN(knowledgeId)) {
    return c.json({ error: 'Invalid knowledge entry ID' }, 400);
  }

  if (rating && (rating < 1 || rating > 5)) {
    return c.json({ error: 'Rating must be between 1 and 5' }, 400);
  }

  try {
    const db = c.env.DB;
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });
    
    const searchEngine = new EnhancedSearchEngine(db, openai);
    
    await searchEngine.submitFeedback({
      knowledge_entry_id: knowledgeId,
      user_id: user.id,
      rating,
      helpful,
      comment,
      feedback_type: feedback_type || 'rating'
    });

    return c.json({ success: true, message: 'Feedback enviado com sucesso!' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return c.json({ error: 'Erro ao enviar feedback' }, 500);
  }
});

// Analytics endpoints for admins
app.get('/api/admin/knowledge/analytics', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user.isAdmin) {
    return c.json({ error: 'Acesso negado. Apenas administradores podem acessar analytics.' }, 403);
  }

  try {
    const db = c.env.DB;

    // Get search analytics for last 30 days
    const searchStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN user_satisfied = true THEN 1 END) as satisfied_searches,
        COUNT(CASE WHEN user_satisfied = false THEN 1 END) as unsatisfied_searches
      FROM search_analytics 
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    // Get popular queries
    const popularQueries = await db.prepare(`
      SELECT query, COUNT(*) as frequency, intent_detected
      FROM search_analytics 
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY query
      ORDER BY frequency DESC
      LIMIT 10
    `).all();

    // Get content performance
    const contentPerformance = await db.prepare(`
      SELECT 
        ke.id,
        ke.feature_module || ' - ' || ke.functionality as title,
        ke.category,
        ke.user_rating,
        ke.popularity_score,
        COUNT(kf.id) as feedback_count,
        AVG(kf.rating) as avg_feedback_rating
      FROM knowledge_entries ke
      LEFT JOIN knowledge_feedback kf ON ke.id = kf.knowledge_entry_id
      WHERE ke.is_active = true
      GROUP BY ke.id
      ORDER BY ke.popularity_score DESC, ke.user_rating DESC
      LIMIT 15
    `).all();

    // Get recent feedback
    const recentFeedback = await db.prepare(`
      SELECT 
        kf.*,
        ke.feature_module || ' - ' || ke.functionality as entry_title
      FROM knowledge_feedback kf
      JOIN knowledge_entries ke ON kf.knowledge_entry_id = ke.id
      ORDER BY kf.created_at DESC
      LIMIT 20
    `).all();

    // Get intent distribution
    const intentDistribution = await db.prepare(`
      SELECT 
        intent_detected,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM search_analytics WHERE created_at >= datetime('now', '-30 days')), 2) as percentage
      FROM search_analytics 
      WHERE created_at >= datetime('now', '-30 days') AND intent_detected IS NOT NULL
      GROUP BY intent_detected
      ORDER BY count DESC
    `).all();

    return c.json({
      search_stats: {
        total_searches: (searchStats as any)?.total_searches || 0,
        unique_users: (searchStats as any)?.unique_users || 0,
        avg_response_time: Math.round((searchStats as any)?.avg_response_time || 0),
        satisfaction_rate: (searchStats as any)?.total_searches > 0 
          ? Math.round(((searchStats as any).satisfied_searches / (searchStats as any).total_searches) * 100) 
          : 0,
        satisfied_searches: (searchStats as any)?.satisfied_searches || 0,
        unsatisfied_searches: (searchStats as any)?.unsatisfied_searches || 0
      },
      popular_queries: popularQueries.results || [],
      content_performance: contentPerformance.results || [],
      recent_feedback: recentFeedback.results || [],
      intent_distribution: intentDistribution.results || [],
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Erro ao carregar analytics' }, 500);
  }
});

// Get popular content endpoint
app.get('/api/knowledge/popular', async (c) => {
  try {
    const db = c.env.DB;
    
    const results = await db.prepare(`
      SELECT 
        id,
        feature_module || ' - ' || functionality as title,
        category,
        subcategory,
        difficulty_level,
        estimated_time,
        quick_action,
        ui_elements_pt,
        user_rating,
        popularity_score
      FROM knowledge_entries 
      WHERE is_active = true
      ORDER BY popularity_score DESC, user_rating DESC
      LIMIT 10
    `).all();

    const popularEntries = results.results.map((entry: any) => ({
      ...entry,
      ui_elements_pt: entry.ui_elements_pt ? JSON.parse(entry.ui_elements_pt) : []
    }));

    return c.json({ popular_entries: popularEntries });
  } catch (error) {
    console.error('Popular content error:', error);
    return c.json({ error: 'Erro ao carregar conteúdo popular' }, 500);
  }
});

// Search suggestions endpoint
app.get('/api/search/suggestions', async (c) => {
  try {
    const db = c.env.DB;
    
    // Get most common search terms from last 7 days
    const suggestions = await db.prepare(`
      SELECT query, COUNT(*) as frequency
      FROM search_analytics 
      WHERE created_at >= datetime('now', '-7 days')
        AND results_count > 0
      GROUP BY query
      ORDER BY frequency DESC
      LIMIT 8
    `).all();

    // Add some default suggestions if not enough data
    const defaultSuggestions = [
      'como fazer login',
      'desafio caverna',
      'configurar rituais',
      'comunidade',
      'recuperar senha',
      'central caverna'
    ];

    const allSuggestions = [
      ...(suggestions.results?.map((s: any) => s.query) || []),
      ...defaultSuggestions
    ];

    // Remove duplicates and limit to 8
    const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 8);

    return c.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return c.json({ 
      suggestions: [
        'como fazer login',
        'desafio caverna',
        'configurar rituais',
        'comunidade',
        'recuperar senha',
        'central caverna'
      ]
    });
  }
});

// Search endpoint
app.post('/api/search', zValidator('json', SearchRequestSchema), async (c) => {
  const { query, language = 'en', category } = c.req.valid('json');
  const startTime = Date.now();

  const db = c.env.DB;
  const openai = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });

  try {
    // Build search query
    let sql = `
      SELECT * FROM knowledge_entries 
      WHERE (
        content_text LIKE ? OR 
        functionality LIKE ? OR 
        description LIKE ? OR
        user_questions_en LIKE ? OR
        user_questions_pt LIKE ?
      )
    `;
    
    const searchTerm = `%${query}%`;
    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY feature_module ASC LIMIT 10';

    const result = await db.prepare(sql).bind(...params).all();
    const relevantEntries = result.results as any[];

    if (relevantEntries.length === 0) {
      return c.json({
        answer: language === 'pt' 
          ? "Desculpe, não encontrei informações sobre isso na documentação do Modo Caverna."
          : "Sorry, I couldn't find information about that in the Modo Caverna documentation.",
        relevantEntries: [],
        responseTime: Date.now() - startTime
      });
    }

    // Create context for AI
    const context = relevantEntries.map(entry => 
      `Feature: ${entry.feature_module} - ${entry.functionality}\n` +
      `Description: ${entry.description}\n` +
      `UI Elements: ${entry.ui_elements || 'N/A'}\n` +
      `Content: ${entry.content_text}\n`
    ).join('\n---\n');

    const systemPrompt = language === 'pt' 
      ? `Você é um assistente especializado na documentação do Modo Caverna. Responda perguntas com base apenas nas informações fornecidas. Seja claro, útil e responda em português brasileiro. Se a informação não estiver disponível, diga que não encontrou na documentação.`
      : `You are an assistant specialized in Modo Caverna documentation. Answer questions based only on the provided information. Be clear, helpful, and respond in English. If information is not available, say you couldn't find it in the documentation.`;

    const userPrompt = language === 'pt'
      ? `Com base na documentação do Modo Caverna abaixo, responda esta pergunta: "${query}"\n\nDocumentação:\n${context}`
      : `Based on the Modo Caverna documentation below, answer this question: "${query}"\n\nDocumentation:\n${context}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content || 
      (language === 'pt' ? 'Não consegui gerar uma resposta.' : 'Could not generate a response.');

    const responseTime = Date.now() - startTime;

    // Log search session
    await db.prepare(`
      INSERT INTO search_sessions (query, response, response_time_ms) 
      VALUES (?, ?, ?)
    `).bind(query, answer, responseTime).run();

    return c.json({
      answer,
      relevantEntries,
      responseTime
    });

  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      answer: language === 'pt' 
        ? 'Ocorreu um erro ao processar sua pergunta. Tente novamente.'
        : 'An error occurred while processing your question. Please try again.',
      relevantEntries: [],
      responseTime: Date.now() - startTime
    }, 500);
  }
});

// Authentication endpoints
// Google OAuth endpoints
app.get('/api/auth/google/url', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth not configured' }, 500);
  }

  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  const state = crypto.randomUUID(); // You might want to store this for validation
  
  const authUrl = getGoogleAuthUrl(clientId, redirectUri, state);
  
  return c.json({ authUrl });
});

app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.redirect('/?error=oauth_cancelled');
  }

  if (!code) {
    return c.redirect('/?error=no_code');
  }

  try {
    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return c.redirect('/?error=oauth_not_configured');
    }

    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
    
    // Exchange code for tokens
    const tokenResponse = await exchangeGoogleCode(code, clientId, clientSecret, redirectUri);
    
    // Get user info
    const googleUser = await getGoogleUserInfo(tokenResponse.access_token);
    
    // Check if user is authorized (fallback to hardcoded list if DB fails)
    const authorizedEmails = [
      'perfilsouiuri@gmail.com',
      'admin@centralcaverna.com', 
      'cavernacentral@gmail.com'
    ];
    
    const adminEmails = [
      'perfilsouiuri@gmail.com',
      'admin@centralcaverna.com',
      'cavernacentral@gmail.com'
    ];
    
    let isAdmin = adminEmails.includes(googleUser.email);
    let isAuthorized = authorizedEmails.includes(googleUser.email);
    
    // Try to check database, but don't fail if it doesn't work
    try {
      const db = c.env.DB;
      
      // Ensure table exists
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS authorized_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          added_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // Check if user exists in database
      const authorizedUser = await db.prepare(`
        SELECT email, name, is_admin FROM authorized_users WHERE email = ?
      `).bind(googleUser.email).first();
      
      if (authorizedUser) {
        isAuthorized = true;
        isAdmin = (authorizedUser as any).is_admin === 1;
      }
    } catch (dbError) {
      console.error('Database error during login, using fallback:', dbError);
      // Continue with hardcoded authorization
    }
    
    if (!isAuthorized) {
      return c.redirect('/?error=access_denied');
    }
    
    // Create user session with admin role
    const user: User = {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      provider: 'google',
      isAdmin: isAdmin
    };

    const sessionId = createSession(user);
    setAuthCookie(c, sessionId);

    return c.redirect('/?auth=success');
  } catch (error) {
    console.error('Google OAuth error:', error);
    return c.redirect('/?error=oauth_failed');
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.post('/api/logout', async (c) => {
  const sessionId = getCookie(c, AUTH_COOKIE_NAME);

  if (sessionId) {
    deleteSession(sessionId);
  }

  clearAuthCookie(c);
  return c.json({ success: true }, 200);
});

// Test MinIO connection
app.get('/api/admin/test-minio', authMiddleware, async (c) => {
  try {
    // Test if we can create a FileService instance
    new FileService(c.env);
    return c.json({ 
      success: true, 
      message: 'MinIO connection successful',
      config: {
        endpoint: c.env.MINIO_ENDPOINT,
        bucket: c.env.MINIO_BUCKET_NAME,
        hasAccessKey: !!c.env.MINIO_ACCESS_KEY,
        hasSecretKey: !!c.env.MINIO_SECRET_KEY
      }
    });
  } catch (error) {
    console.error('MinIO test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false, 
      message: 'MinIO connection failed',
      error: errorMessage 
    }, 500);
  }
});

// Admin middleware - check if user is admin
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || !user.isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
};

// Initialize database endpoint
app.post('/api/admin/init-db', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  
  try {
    // Create table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS authorized_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        added_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Initialize with default users if table is empty
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM authorized_users').first() as { count: number } | null;
    if (userCount && userCount.count === 0) {
      const defaultUsers = [
        { email: 'projetoiurimeira@gmail.com', name: 'Admin User', is_admin: true },
        { email: 'admin@centralcaverna.com', name: 'Admin', is_admin: true },
        { email: 'cavernacentral@gmail.com', name: 'Central Caverna Admin', is_admin: true }
      ];
      
      for (const user of defaultUsers) {
        await db.prepare(`
          INSERT OR IGNORE INTO authorized_users (email, name, is_admin, added_by)
          VALUES (?, ?, ?, 'system')
        `).bind(user.email, user.name, user.is_admin).run();
      }
    }
    
    return c.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return c.json({ error: 'Failed to initialize database' }, 500);
  }
});

// Admin endpoints for user management
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  
  try {
    const users = await db.prepare(`
      SELECT email, name, is_admin, added_by, created_at 
      FROM authorized_users 
      ORDER BY created_at DESC
    `).all();
    
    return c.json({ users: users.results });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { email, name, isAdmin = false } = body;
  const currentUser = c.get('user');
  
  if (!email || !name) {
    return c.json({ error: 'Email and name are required' }, 400);
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }
  
  try {
    await db.prepare(`
      INSERT INTO authorized_users (email, name, is_admin, added_by)
      VALUES (?, ?, ?, ?)
    `).bind(email, name, isAdmin, currentUser.email).run();
    
    return c.json({ success: true, message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'User already exists' }, 400);
    }
    return c.json({ error: 'Failed to add user' }, 500);
  }
});

app.delete('/api/admin/users/:email', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const email = c.req.param('email');
  const currentUser = c.get('user');
  
  // Prevent self-deletion
  if (email === currentUser.email) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }
  
  try {
    const result = await db.prepare(`
      DELETE FROM authorized_users WHERE email = ?
    `).bind(email).run();
    
    if (result.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('Error removing user:', error);
    return c.json({ error: 'Failed to remove user' }, 500);
  }
});

app.put('/api/admin/users/:email', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const email = c.req.param('email');
  const body = await c.req.json();
  const { name, isAdmin } = body;
  const currentUser = c.get('user');
  
  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }
  
  // Prevent removing admin from self
  if (email === currentUser.email && !isAdmin) {
    return c.json({ error: 'Cannot remove admin privileges from your own account' }, 400);
  }
  
  try {
    const result = await db.prepare(`
      UPDATE authorized_users 
      SET name = ?, is_admin = ?
      WHERE email = ?
    `).bind(name, isAdmin, email).run();
    
    if (result.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Capitão Caverna Image Generation Endpoints

// Get available prompt options
app.get('/api/v1/images/options', authMiddleware, async (c) => {
  try {
    const promptEngine = new PromptTemplateEngineImpl();
    const options = promptEngine.getAvailableOptions();
    return c.json(options);
  } catch (error) {
    console.error('Error getting prompt options:', error);
    return c.json({ error: 'Failed to load options' }, 500);
  }
});

// Validate image generation parameters
app.post('/api/v1/images/validate', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { params } = body;
    
    const promptEngine = new PromptTemplateEngineImpl();
    const validation = promptEngine.validateParameters(params);
    
    return c.json(validation);
  } catch (error) {
    console.error('Error validating parameters:', error);
    return c.json({ error: 'Validation failed' }, 500);
  }
});

// Generate image endpoint
app.post('/api/v1/images/generate', authMiddleware, zValidator('json', ImageGenerationRequestSchema), async (c) => {
  const { params } = c.req.valid('json');
  const user = c.get('user');
  
  try {
    // Initialize services
    const promptEngine = new PromptTemplateEngineImpl();
    const database = new DatabaseLayer(c.env.DB);
    
    // Validate parameters
    const validation = promptEngine.validateParameters(params);
    if (!validation.isValid) {
      return c.json({
        success: false,
        error: `Invalid parameters: ${validation.errors.join(', ')}`,
        status: 'FAILED'
      } as ImageGenerationResponse, 400);
    }
    
    // Generate unique image ID
    const imageId = crypto.randomUUID();
    
    // Insert initial record with PENDING status
    await database.insertGeneratedImage({
      image_id: imageId,
      user_id: user.id,
      r2_object_key: '', // Will be updated after generation
      prompt_parameters: JSON.stringify(params),
      created_at: new Date().toISOString(),
      status: 'PENDING',
      error_message: null,
      generation_time_ms: null,
      service_used: null,
      public_url: null,
    });
    
    // For now, return pending status - actual generation would be handled by a background job
    // In a real implementation, this would trigger external AI service generation
    
    return c.json({
      success: true,
      image_id: imageId,
      status: 'PENDING'
    } as ImageGenerationResponse);
    
  } catch (error) {
    console.error('Error generating image:', error);
    return c.json({
      success: false,
      error: 'Image generation failed',
      status: 'FAILED'
    } as ImageGenerationResponse, 500);
  }
});

// Get image generation status
app.get('/api/v1/images/:imageId/status', authMiddleware, async (c) => {
  const imageId = c.req.param('imageId');
  const user = c.get('user');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const image = await database.getImageById(imageId);
    
    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image or is admin
    if (image.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    return c.json({
      success: true,
      image_id: image.image_id,
      status: image.status,
      public_url: image.public_url,
      error: image.error_message,
      created_at: image.created_at,
      generation_time_ms: image.generation_time_ms
    });
    
  } catch (error) {
    console.error('Error getting image status:', error);
    return c.json({ error: 'Failed to get image status' }, 500);
  }
});

// Get user's generated images
app.get('/api/v1/images/user/:userId', authMiddleware, async (c) => {
  const userId = c.req.param('userId');
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  
  // Check if user can access these images
  if (userId !== user.id && !user.isAdmin) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const images = await database.getUserImages(userId, limit, offset);
    
    return c.json({
      success: true,
      images: images.map(img => ({
        image_id: img.image_id,
        status: img.status,
        public_url: img.public_url,
        prompt_parameters: JSON.parse(img.prompt_parameters),
        created_at: img.created_at,
        generation_time_ms: img.generation_time_ms,
        service_used: img.service_used
      })),
      total: images.length
    });
    
  } catch (error) {
    console.error('Error getting user images:', error);
    return c.json({ error: 'Failed to get user images' }, 500);
  }
});

// Delete generated image (admin only)
app.delete('/api/v1/images/:imageId', authMiddleware, adminMiddleware, async (c) => {
  // Check if image services are available
  if (!isImageServiceAvailable(c.env)) {
    return imageServiceUnavailableResponse();
  }
  
  const imageId = c.req.param('imageId');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const assetStorage = new AssetStorageManager(c.env.IMAGE_BUCKET);
    
    // Get image record
    const image = await database.getImageById(imageId);
    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Delete from R2 if exists
    if (image.r2_object_key) {
      await assetStorage.deleteImage(image.r2_object_key);
    }
    
    // Delete from database
    await database.deleteImage(imageId);
    
    return c.json({ success: true, message: 'Image deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

// Admin endpoints for image management

// Get all images (admin only)
app.get('/api/v1/admin/images', authMiddleware, adminMiddleware, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  const status = c.req.query('status');
  
  try {
    let sql = `
      SELECT image_id, user_id, r2_object_key, prompt_parameters, created_at,
             status, error_message, generation_time_ms, service_used, public_url
      FROM GeneratedImages
    `;
    
    const params: any[] = [];
    
    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Use direct database connection
    const connection = new DatabaseConnection(c.env.DB);
    const images = await connection.all(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM GeneratedImages';
    const countParams: any[] = [];
    
    if (status && status !== 'all') {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const countResult = await connection.first<{ count: number }>(countSql, countParams);
    const total = countResult?.count || 0;
    
    return c.json({
      success: true,
      images,
      total,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Error getting admin images:', error);
    return c.json({ error: 'Failed to get images' }, 500);
  }
});

// Get comprehensive statistics (admin only)
app.get('/api/v1/admin/images/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    const database = new DatabaseLayer(c.env.DB);
    
    // Get basic stats
    const stats = await database.getStats();
    
    // Get top generators
    const topGenerators = await database.getTopImageGenerators(10);
    
    // Get recent activity
    const recentActivity = await database.getRecentActivity(20);
    
    // Get service usage stats
    const serviceStats = await database.getServiceUsageStats();
    
    return c.json({
      success: true,
      totalImages: stats.totalImages,
      pendingImages: stats.pendingImages,
      completeImages: stats.completeImages,
      failedImages: stats.failedImages,
      cacheEntries: stats.cacheEntries,
      avgGenerationTime: stats.avgGenerationTime,
      topGenerators,
      recentActivity,
      serviceStats
    });
    
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return c.json({ error: 'Failed to get statistics' }, 500);
  }
});

// Cleanup old images (admin only)
app.post('/api/v1/admin/images/cleanup', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { daysOld = 7, type = 'failed' } = body;
    
    const database = new DatabaseLayer(c.env.DB);
    
    let deletedCount = 0;
    
    if (type === 'failed') {
      deletedCount = await database.cleanupFailedImages(daysOld);
    }
    
    return c.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} ${type} images older than ${daysOld} days`
    });
    
  } catch (error) {
    console.error('Error cleaning up images:', error);
    return c.json({ error: 'Failed to cleanup images' }, 500);
  }
});

app.put('/api/admin/users/:email', authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const email = c.req.param('email');
  const body = await c.req.json();
  const { name, isAdmin } = body;
  const currentUser = c.get('user');
  
  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }
  
  // Prevent removing admin from self
  if (email === currentUser.email && !isAdmin) {
    return c.json({ error: 'Cannot remove admin privileges from your own account' }, 400);
  }
  
  try {
    const result = await db.prepare(`
      UPDATE authorized_users 
      SET name = ?, is_admin = ?
      WHERE email = ?
    `).bind(name, isAdmin, email).run();
    
    if (result.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Admin endpoints (protected)
app.post('/api/admin/add-text', authMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();

  try {
    const insertStmt = db.prepare(`
      INSERT INTO knowledge_entries (
        feature_module, functionality, description, ui_elements,
        user_questions_en, user_questions_pt, category, content_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insertStmt.bind(
      body.feature_module,
      body.functionality,
      body.description,
      body.ui_elements || null,
      body.user_questions_en || null,
      body.user_questions_pt || null,
      body.category,
      body.content_text
    ).run();

    return c.json({ success: true, message: 'Text entry added successfully', entriesAdded: 1 });
  } catch (error) {
    console.error('Error adding text entry:', error);
    return c.json({ success: false, message: 'Failed to add text entry' }, 500);
  }
});

app.post('/api/admin/add-faq', authMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();

  try {
    const insertStmt = db.prepare(`
      INSERT INTO knowledge_entries (
        feature_module, functionality, description, ui_elements,
        user_questions_en, user_questions_pt, category, content_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contentText = `FAQ: ${body.question_en}\nAnswer: ${body.answer_en}\n\nFAQ (PT): ${body.question_pt}\nAnswer (PT): ${body.answer_pt}`;

    await insertStmt.bind(
      'FAQ',
      'Frequently Asked Question',
      `FAQ entry covering: ${body.question_en}`,
      null,
      body.question_en,
      body.question_pt,
      body.category,
      contentText
    ).run();

    return c.json({ success: true, message: 'FAQ entry added successfully', entriesAdded: 1 });
  } catch (error) {
    console.error('Error adding FAQ entry:', error);
    return c.json({ success: false, message: 'Failed to add FAQ entry' }, 500);
  }
});

// Get uploaded files list
app.get('/api/admin/files', authMiddleware, async (c) => {
  const db = c.env.DB;
  
  try {
    const result = await db.prepare(`
      SELECT * FROM uploaded_files 
      ORDER BY created_at DESC
    `).all();

    return c.json({ files: result.results });
  } catch (error) {
    console.error('Error fetching files:', error);
    return c.json({ error: 'Failed to fetch files' }, 500);
  }
});

// Delete uploaded file
app.delete('/api/admin/files/:id', authMiddleware, async (c) => {
  const db = c.env.DB;
  const fileId = c.req.param('id');

  try {
    // Get file info first
    const fileResult = await db.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(fileId).first();
    
    if (!fileResult) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Delete from Minio (optional - you might want to keep files)
    // const fileService = new FileService(c.env);
    // await fileService.deleteFile(fileResult.minio_key);

    // Delete related knowledge entries
    await db.prepare(`
      DELETE FROM knowledge_entries 
      WHERE functionality LIKE ? AND feature_module = 'Uploaded Document'
    `).bind(`%${(fileResult as any).original_name}%`).run();

    // Delete file record
    await db.prepare('DELETE FROM uploaded_files WHERE id = ?').bind(fileId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

app.post('/api/admin/upload-file', authMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;

  if (!file || !category) {
    return c.json({ success: false, message: 'File and category are required' }, 400);
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return c.json({ success: false, message: 'File size must be less than 10MB' }, 400);
  }

  // Check file type
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (!allowedTypes.includes(file.type)) {
    return c.json({ 
      success: false, 
      message: 'Unsupported file type. Supported formats: TXT, PDF, DOCX' 
    }, 400);
  }

  try {
    const fileService = new FileService(c.env);
    const result = await fileService.processAndStoreFile(file, category, c.env.DB);
    
    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    console.error('File upload error:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false, 
      message: 'Failed to upload file', 
      error: errorMessage 
    }, 500);
  }
});

// ===== CAPITÃO CAVERNA IMAGE ENGINE API ENDPOINTS =====

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

const checkRateLimit = (userId: string): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true };
};

// Main image generation endpoint
app.post('/api/v1/images/generate', authMiddleware, zValidator('json', ImageGenerationRequestSchema), async (c) => {
  // Check if image services are available
  if (!isImageServiceAvailable(c.env)) {
    return imageServiceUnavailableResponse();
  }
  
  const user = c.get('user');
  const { params } = c.req.valid('json');
  
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return c.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.resetTime
      }, 429);
    }

    // Initialize services
    const promptEngine = new PromptTemplateEngineImpl();
    const storageManager = new AssetStorageManager(c.env.IMAGE_BUCKET);
    const database = new DatabaseLayer(c.env.DB);
    const securityManager = new SecurityManager(c.env);

    // Validate parameters
    const validation = promptEngine.validateParameters(params);
    if (!validation.isValid) {
      return c.json({
        success: false,
        error: `Invalid parameters: ${validation.errors.join(', ')}`,
        status: 'FAILED'
      } as ImageGenerationResponse, 400);
    }

    // Build prompt for content safety validation
    const prompt = promptEngine.buildPrompt(params);
    
    // Validate prompt content for safety
    const contentSafety = await securityManager.validatePromptContent(prompt);
    if (!contentSafety.safe) {
      await securityManager.logSecurityEvent({
        userId: user.id,
        ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
        userAgent: c.req.header('User-Agent') || 'unknown',
        action: 'content_safety_violation',
        resource: '/api/v1/images/generate',
        status: 'blocked',
        details: { 
          originalPrompt: prompt,
          flags: contentSafety.flags,
          confidence: contentSafety.confidence
        },
        riskLevel: 'high'
      });
      
      return c.json({
        success: false,
        error: 'Content does not meet safety guidelines',
        details: contentSafety.flags,
        status: 'FAILED'
      } as ImageGenerationResponse, 400);
    }

    // Generate unique image ID
    const imageId = crypto.randomUUID();

    // Create initial database record
    const initialRecord: GeneratedImageRecord = {
      image_id: imageId,
      user_id: user.id,
      r2_object_key: '', // Will be set after successful generation
      prompt_parameters: JSON.stringify(params),
      created_at: new Date().toISOString(),
      status: 'PENDING',
      error_message: null,
      generation_time_ms: null,
      service_used: null,
      public_url: null
    };

    await database.insertGeneratedImage(initialRecord);

    // Start async generation process
    c.executionCtx.waitUntil(
      (async () => {
        const startTime = Date.now();
        
        try {
          // Build prompt (for logging/caching purposes)
          promptEngine.buildPrompt(params);
          
          // For now, we'll use a mock implementation since the full service integration is complex
          // In a real implementation, this would call the actual AI service
          const mockImageUrl = 'https://via.placeholder.com/512x512/808080/FFFFFF?text=Capitao+Caverna';
          
          // Fetch image data (in real implementation, this would be from the AI service)
          const imageResponse = await fetch(mockImageUrl);
          if (!imageResponse.ok) {
            await database.updateImageStatus(imageId, 'FAILED', 'Failed to fetch generated image');
            return;
          }

          const imageBlob = await imageResponse.blob();
          
          // Store in R2
          const storageResult = await storageManager.storeImage(imageBlob, {
            originalFilename: `capitao-caverna-${imageId}.png`,
            contentType: 'image/png',
            size: imageBlob.size,
            generationParams: params,
            createdAt: new Date().toISOString()
          });

          if (!storageResult.success) {
            await database.updateImageStatus(imageId, 'FAILED', storageResult.error);
            return;
          }

          // Update database with final results
          const generationTime = Date.now() - startTime;
          await database.updateGeneratedImage(imageId, {
            status: 'COMPLETE',
            r2_object_key: storageResult.objectKey,
            public_url: storageResult.publicUrl,
            generation_time_ms: generationTime,
            service_used: 'mock' // In real implementation, this would be the actual service name
          });

        } catch (error) {
          console.error('Image generation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          await database.updateImageStatus(imageId, 'FAILED', errorMessage);
        }
      })()
    );

    // Return immediate response with image ID for polling
    return c.json({
      success: true,
      image_id: imageId,
      status: 'PENDING'
    } as ImageGenerationResponse);

  } catch (error) {
    console.error('API error:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      status: 'FAILED'
    } as ImageGenerationResponse, 500);
  }
});

// Status polling endpoint
app.get('/api/v1/images/:imageId/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const imageId = c.req.param('imageId');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const imageRecord = await database.getGeneratedImage(imageId);
    
    if (!imageRecord) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image (or is admin)
    if (imageRecord.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const response: any = {
      image_id: imageRecord.image_id,
      status: imageRecord.status,
      created_at: imageRecord.created_at
    };
    
    if (imageRecord.status === 'COMPLETE') {
      response.public_url = imageRecord.public_url;
      response.generation_time_ms = imageRecord.generation_time_ms;
    } else if (imageRecord.status === 'FAILED') {
      response.error_message = imageRecord.error_message;
    } else if (imageRecord.status === 'PENDING') {
      // Calculate estimated completion time (rough estimate)
      const createdAt = new Date(imageRecord.created_at).getTime();
      const elapsed = Date.now() - createdAt;
      const estimatedTotal = 60000; // 60 seconds average
      const progress = Math.min(elapsed / estimatedTotal, 0.95); // Cap at 95% until complete
      
      response.progress = Math.round(progress * 100);
      response.estimated_completion = new Date(createdAt + estimatedTotal).toISOString();
    }
    
    return c.json(response);
    
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// User image management endpoint
app.get('/api/v1/images/user/:userId', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const requestedUserId = c.req.param('userId');
  
  // Users can only access their own images unless they're admin
  if (requestedUserId !== currentUser.id && !currentUser.isAdmin) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    
    // Parse query parameters for filtering and pagination
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const statusParam = url.searchParams.get('status');
    const status = statusParam as 'PENDING' | 'COMPLETE' | 'FAILED' | undefined;
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    const images = await database.getUserImages(requestedUserId, {
      limit: Math.min(limit, 100), // Cap at 100
      offset,
      status,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    
    // Get total count for pagination
    const totalCount = await database.getUserImageCount(requestedUserId, status);
    
    return c.json({
      images: images.map(img => ({
        image_id: img.image_id,
        status: img.status,
        public_url: img.public_url,
        created_at: img.created_at,
        generation_time_ms: img.generation_time_ms,
        service_used: img.service_used,
        prompt_parameters: JSON.parse(img.prompt_parameters),
        error_message: img.error_message
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
    
  } catch (error) {
    console.error('User images fetch error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete user image endpoint
app.delete('/api/v1/images/:imageId', authMiddleware, async (c) => {
  // Check if image services are available
  if (!isImageServiceAvailable(c.env)) {
    return imageServiceUnavailableResponse();
  }
  
  const user = c.get('user');
  const imageId = c.req.param('imageId');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const imageRecord = await database.getGeneratedImage(imageId);
    
    if (!imageRecord) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image (or is admin)
    if (imageRecord.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // Delete from R2 if it exists
    if (imageRecord.r2_object_key) {
      const storageManager = new AssetStorageManager(c.env.IMAGE_BUCKET);
      await storageManager.deleteImage(imageRecord.r2_object_key);
    }
    
    // Delete from database
    await database.deleteGeneratedImage(imageId);
    
    return c.json({ success: true, message: 'Image deleted successfully' });
    
  } catch (error) {
    console.error('Image deletion error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Bulk operations for admin
app.post('/api/v1/admin/images/bulk-delete', authMiddleware, adminMiddleware, async (c) => {
  // Check if image services are available
  if (!isImageServiceAvailable(c.env)) {
    return imageServiceUnavailableResponse();
  }
  
  const body = await c.req.json();
  const { imageIds } = body;
  
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return c.json({ error: 'Invalid image IDs array' }, 400);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const storageManager = new AssetStorageManager(c.env.IMAGE_BUCKET);
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const imageId of imageIds) {
      try {
        const imageRecord = await database.getGeneratedImage(imageId);
        
        if (imageRecord) {
          // Delete from R2 if it exists
          if (imageRecord.r2_object_key) {
            await storageManager.deleteImage(imageRecord.r2_object_key);
          }
          
          // Delete from database
          await database.deleteGeneratedImage(imageId);
          deletedCount++;
        }
      } catch (error) {
        errors.push(`Failed to delete ${imageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return c.json({
      success: true,
      deletedCount,
      totalRequested: imageIds.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get available prompt options
app.get('/api/v1/images/options', authMiddleware, async (c) => {
  try {
    const promptEngine = new PromptTemplateEngineImpl();
    const options = promptEngine.getAvailableOptions();
    
    return c.json(options);
    
  } catch (error) {
    console.error('Options fetch error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// WebSocket endpoint for real-time status updates (optional)
// Note: This is a placeholder implementation. Full WebSocket support in Cloudflare Workers
// requires additional configuration and may have limitations.
app.get('/api/v1/images/:imageId/ws', authMiddleware, async (c) => {
  const user = c.get('user');
  const imageId = c.req.param('imageId');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const imageRecord = await database.getGeneratedImage(imageId);
    
    if (!imageRecord) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image (or is admin)
    if (imageRecord.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // Check if the request is a WebSocket upgrade
    const upgradeHeader = c.req.header('upgrade');
    if (upgradeHeader !== 'websocket') {
      return c.json({ 
        error: 'WebSocket upgrade required',
        message: 'This endpoint requires WebSocket connection. Use ws:// or wss:// protocol. For now, please use the polling endpoint /api/v1/images/:imageId/status instead.'
      }, 400);
    }
    
    // For now, return information about using the polling endpoint instead
    return c.json({
      message: 'WebSocket support is planned for future implementation',
      alternative: {
        endpoint: `/api/v1/images/${imageId}/status`,
        method: 'GET',
        polling_interval: '2-5 seconds recommended',
        description: 'Use this endpoint to poll for status updates'
      },
      current_status: {
        image_id: imageRecord.image_id,
        status: imageRecord.status,
        created_at: imageRecord.created_at
      }
    });
    
  } catch (error) {
    console.error('WebSocket setup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Enhanced status endpoint with more detailed progress information
app.get('/api/v1/images/:imageId/status/detailed', authMiddleware, async (c) => {
  const user = c.get('user');
  const imageId = c.req.param('imageId');
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const imageRecord = await database.getGeneratedImage(imageId);
    
    if (!imageRecord) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image (or is admin)
    if (imageRecord.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const response: any = {
      image_id: imageRecord.image_id,
      status: imageRecord.status,
      created_at: imageRecord.created_at,
      service_used: imageRecord.service_used,
      prompt_parameters: JSON.parse(imageRecord.prompt_parameters),
      timestamp: new Date().toISOString()
    };
    
    if (imageRecord.status === 'COMPLETE') {
      response.public_url = imageRecord.public_url;
      response.generation_time_ms = imageRecord.generation_time_ms;
      response.completion_rate = 100;
    } else if (imageRecord.status === 'FAILED') {
      response.error_message = imageRecord.error_message;
      response.completion_rate = 0;
    } else if (imageRecord.status === 'PENDING') {
      // Enhanced progress calculation with stages
      const createdAt = new Date(imageRecord.created_at).getTime();
      const elapsed = Date.now() - createdAt;
      const estimatedTotal = 60000; // 60 seconds average
      const progress = Math.min(elapsed / estimatedTotal, 0.95);
      
      response.progress = Math.round(progress * 100);
      response.estimated_completion = new Date(createdAt + estimatedTotal).toISOString();
      response.elapsed_time_ms = elapsed;
      
      // Add stage information
      if (progress < 0.1) {
        response.stage = 'initializing';
        response.stage_description = 'Preparing generation request';
      } else if (progress < 0.3) {
        response.stage = 'processing';
        response.stage_description = 'Processing prompt and parameters';
      } else if (progress < 0.7) {
        response.stage = 'generating';
        response.stage_description = 'Generating image with AI service';
      } else if (progress < 0.9) {
        response.stage = 'storing';
        response.stage_description = 'Storing image and updating metadata';
      } else {
        response.stage = 'finalizing';
        response.stage_description = 'Finalizing generation process';
      }
      
      response.completion_rate = Math.round(progress * 100);
    }
    
    return c.json(response);
    
  } catch (error) {
    console.error('Detailed status check error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Batch status check endpoint for multiple images
app.post('/api/v1/images/status/batch', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { imageIds } = body;
  
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return c.json({ error: 'Invalid image IDs array' }, 400);
  }
  
  if (imageIds.length > 50) {
    return c.json({ error: 'Maximum 50 images per batch request' }, 400);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const results: any[] = [];
    
    for (const imageId of imageIds) {
      try {
        const imageRecord = await database.getGeneratedImage(imageId);
        
        if (!imageRecord) {
          results.push({
            image_id: imageId,
            error: 'Image not found'
          });
          continue;
        }
        
        // Check if user owns this image (or is admin)
        if (imageRecord.user_id !== user.id && !user.isAdmin) {
          results.push({
            image_id: imageId,
            error: 'Access denied'
          });
          continue;
        }
        
        const statusInfo: any = {
          image_id: imageRecord.image_id,
          status: imageRecord.status,
          created_at: imageRecord.created_at
        };
        
        if (imageRecord.status === 'COMPLETE') {
          statusInfo.public_url = imageRecord.public_url;
          statusInfo.generation_time_ms = imageRecord.generation_time_ms;
        } else if (imageRecord.status === 'FAILED') {
          statusInfo.error_message = imageRecord.error_message;
        } else if (imageRecord.status === 'PENDING') {
          const createdAt = new Date(imageRecord.created_at).getTime();
          const elapsed = Date.now() - createdAt;
          const estimatedTotal = 60000;
          const progress = Math.min(elapsed / estimatedTotal, 0.95);
          
          statusInfo.progress = Math.round(progress * 100);
          statusInfo.estimated_completion = new Date(createdAt + estimatedTotal).toISOString();
        }
        
        results.push(statusInfo);
        
      } catch (error) {
        results.push({
          image_id: imageId,
          error: 'Failed to fetch status'
        });
      }
    }
    
    return c.json({
      results,
      timestamp: new Date().toISOString(),
      total_requested: imageIds.length,
      successful: results.filter(r => !r.error).length
    });
    
  } catch (error) {
    console.error('Batch status check error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update image metadata endpoint
app.patch('/api/v1/images/:imageId/metadata', authMiddleware, async (c) => {
  const user = c.get('user');
  const imageId = c.req.param('imageId');
  const body = await c.req.json();
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const imageRecord = await database.getGeneratedImage(imageId);
    
    if (!imageRecord) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    // Check if user owns this image (or is admin)
    if (imageRecord.user_id !== user.id && !user.isAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // Only allow updating certain metadata fields
    const allowedUpdates: any = {};
    
    // For now, we don't allow updating core metadata, but this could be extended
    // to allow updating custom tags, descriptions, etc.
    if (body.custom_tags && Array.isArray(body.custom_tags)) {
      // This would require adding a custom_tags column to the database
      // For now, we'll just acknowledge the request
      allowedUpdates.custom_tags = body.custom_tags;
    }
    
    return c.json({
      success: true,
      message: 'Metadata update acknowledged',
      image_id: imageId,
      note: 'Custom metadata updates will be supported in future versions'
    });
    
  } catch (error) {
    console.error('Metadata update error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get image generation statistics for a user
app.get('/api/v1/images/user/:userId/stats', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const requestedUserId = c.req.param('userId');
  
  // Users can only access their own stats unless they're admin
  if (requestedUserId !== currentUser.id && !currentUser.isAdmin) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    
    // Get comprehensive statistics
    const [
      totalImages,
      pendingImages,
      completeImages,
      failedImages,
      recentImages,
      avgGenerationTime
    ] = await Promise.all([
      database.getUserImageCount(requestedUserId),
      database.getUserImageCount(requestedUserId, 'PENDING'),
      database.getUserImageCount(requestedUserId, 'COMPLETE'),
      database.getUserImageCount(requestedUserId, 'FAILED'),
      database.getUserImages(requestedUserId, { limit: 10, sortBy: 'created_at', sortOrder: 'desc' }),
      database.getUserAverageGenerationTime(requestedUserId)
    ]);
    
    // Calculate success rate
    const successRate = totalImages > 0 ? Math.round((completeImages / totalImages) * 100) : 0;
    
    // Get most used parameters
    const parameterStats = await database.getUserParameterStats(requestedUserId);
    
    return c.json({
      user_id: requestedUserId,
      statistics: {
        total_images: totalImages,
        pending_images: pendingImages,
        complete_images: completeImages,
        failed_images: failedImages,
        success_rate: successRate,
        average_generation_time_ms: avgGenerationTime
      },
      recent_activity: {
        recent_images: recentImages.map(img => ({
          image_id: img.image_id,
          status: img.status,
          created_at: img.created_at,
          public_url: img.status === 'COMPLETE' ? img.public_url : null
        })),
        last_generation: recentImages.length > 0 ? recentImages[0].created_at : null
      },
      popular_parameters: parameterStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('User stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Search user images by parameters
app.post('/api/v1/images/user/:userId/search', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const requestedUserId = c.req.param('userId');
  const body = await c.req.json();
  
  // Users can only search their own images unless they're admin
  if (requestedUserId !== currentUser.id && !currentUser.isAdmin) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    const { pose, outfit, footwear, prop, frameType, status, limit = 20, offset = 0 } = body;
    
    const searchResults = await database.searchUserImagesByParameters(requestedUserId, {
      pose,
      outfit,
      footwear,
      prop,
      frameType,
      status,
      limit: Math.min(limit, 100),
      offset
    });
    
    const totalCount = await database.countUserImagesByParameters(requestedUserId, {
      pose,
      outfit,
      footwear,
      prop,
      frameType,
      status
    });
    
    return c.json({
      results: searchResults.map(img => ({
        image_id: img.image_id,
        status: img.status,
        public_url: img.status === 'COMPLETE' ? img.public_url : null,
        created_at: img.created_at,
        generation_time_ms: img.generation_time_ms,
        prompt_parameters: JSON.parse(img.prompt_parameters)
      })),
      search_criteria: { pose, outfit, footwear, prop, frameType, status },
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Image search error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Export user images (for data portability)
app.get('/api/v1/images/user/:userId/export', authMiddleware, async (c) => {
  const currentUser = c.get('user');
  const requestedUserId = c.req.param('userId');
  
  // Users can only export their own images unless they're admin
  if (requestedUserId !== currentUser.id && !currentUser.isAdmin) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    
    // Get all user images
    const allImages = await database.getUserImages(requestedUserId, { 
      limit: 1000, // Large limit for export
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    
    const exportData = {
      user_id: requestedUserId,
      export_timestamp: new Date().toISOString(),
      total_images: allImages.length,
      images: allImages.map(img => ({
        image_id: img.image_id,
        status: img.status,
        public_url: img.status === 'COMPLETE' ? img.public_url : null,
        r2_object_key: img.r2_object_key,
        prompt_parameters: JSON.parse(img.prompt_parameters),
        created_at: img.created_at,
        generation_time_ms: img.generation_time_ms,
        service_used: img.service_used,
        error_message: img.error_message
      }))
    };
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="capitao-caverna-images-${requestedUserId}-${Date.now()}.json"`);
    
    return new Response(JSON.stringify(exportData, null, 2), { headers });
    
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin endpoint to get system-wide image statistics
app.get('/api/v1/admin/images/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    const database = new DatabaseLayer(c.env.DB);
    const stats = await database.getStats();
    
    // Get additional admin-specific stats
    const [
      topUsers,
      recentActivity,
      serviceUsage
    ] = await Promise.all([
      database.getTopImageGenerators(10),
      database.getRecentActivity(50),
      database.getServiceUsageStats()
    ]);
    
    return c.json({
      system_statistics: stats,
      top_users: topUsers,
      recent_activity: recentActivity,
      service_usage: serviceUsage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin endpoint for system maintenance
app.post('/api/v1/admin/images/maintenance', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();
  const { action, parameters } = body;
  
  try {
    const database = new DatabaseLayer(c.env.DB);
    let result: any = { success: false };
    
    switch (action) {
      case 'cleanup_failed':
        // Clean up failed images older than specified days
        const daysOld = parameters?.days || 7;
        const deletedCount = await database.cleanupFailedImages(daysOld);
        result = {
          success: true,
          action: 'cleanup_failed',
          deleted_count: deletedCount,
          message: `Cleaned up ${deletedCount} failed images older than ${daysOld} days`
        };
        break;
        
      case 'cleanup_cache':
        // Clean up old prompt cache entries
        const cacheDaysOld = parameters?.days || 30;
        const cacheDeletedCount = await database.cleanupPromptCache(cacheDaysOld);
        result = {
          success: true,
          action: 'cleanup_cache',
          deleted_count: cacheDeletedCount,
          message: `Cleaned up ${cacheDeletedCount} cache entries older than ${cacheDaysOld} days`
        };
        break;
        
      case 'recompute_stats':
        // Recompute and cache statistics
        const newStats = await database.getStats();
        result = {
          success: true,
          action: 'recompute_stats',
          statistics: newStats,
          message: 'Statistics recomputed successfully'
        };
        break;
        
      default:
        return c.json({ error: 'Invalid maintenance action' }, 400);
    }
    
    return c.json(result);
    
  } catch (error) {
    console.error('Maintenance error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Production monitoring endpoints
app.get('/health', async (c) => {
  const healthCheckHandler = createHealthCheckHandler(c.env);
  return await healthCheckHandler();
});

app.get('/metrics', async (c) => {
  const metricsHandler = createMetricsHandler(c.env);
  return await metricsHandler();
});

// Security dashboard endpoint (admin only)
app.get('/api/v1/admin/security/report', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Check admin permissions
  if (!user.isAdmin) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    const securityManager = new SecurityManager(c.env);
    const report = await securityManager.generateSecurityReport();
    
    return c.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security report generation failed:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to generate security report' 
    }, 500);
  }
});

// Security audit logs endpoint (admin only)
app.get('/api/v1/admin/security/audit', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Check admin permissions
  if (!user.isAdmin) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  // Check if image services are available
  if (!isImageServiceAvailable(c.env)) {
    return imageServiceUnavailableResponse();
  }
  
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const riskLevel = c.req.query('risk_level');
    const action = c.req.query('action');
    
    let query = `
      SELECT * FROM SecurityAuditLog 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (riskLevel) {
      query += ' AND risk_level = ?';
      params.push(riskLevel);
    }
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await c.env.IMAGE_DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      data: result.results || [],
      pagination: {
        limit,
        offset,
        total: result.results?.length || 0
      }
    });
  } catch (error) {
    console.error('Security audit query failed:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to retrieve audit logs' 
    }, 500);
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', async (c) => {
  const url = new URL(c.req.url);
  
  // Skip API routes - let them 404 naturally
  if (url.pathname.startsWith('/api/')) {
    return c.notFound();
  }
  
  // Skip asset routes - let them be served by the assets system
  if (url.pathname.startsWith('/assets/')) {
    return c.notFound();
  }
  
  // For all other routes, redirect to root so assets system can serve index.html
  // This allows React Router to handle client-side routing
  return c.redirect('/');
});

export default app;
