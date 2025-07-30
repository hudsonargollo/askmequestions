import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { getCookie, setCookie } from "hono/cookie";
import OpenAI from 'openai';
import { SearchRequestSchema } from '../shared/types';
import { FileService } from './fileService';

import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

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

// Populate database endpoint
app.post('/api/populate-db', async (c) => {
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

// Get filter options
app.get('/api/filters', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT DISTINCT category FROM knowledge_entries ORDER BY category').all();
  const categories = result.results.map((row: any) => row.category);
  
  return c.json({ categories });
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
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
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
    `).bind(`%${fileResult.original_name}%`).run();

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
    return c.json({ success: false, message: 'Failed to upload file' }, 500);
  }
});

export default app;
