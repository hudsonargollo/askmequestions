import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Loader2, 
  MessageCircle, 
  Book, 
  Sparkles, 
  User, 
  Star,
  Clock,
  Zap,
  TrendingUp,
  Heart,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import UserProfile from './UserProfile';

interface EnhancedSearchResult {
  id: number;
  title: string;
  content_text: string;
  category: string;
  subcategory: string;
  difficulty_level: 'basico' | 'intermediario' | 'avancado';
  estimated_time: number;
  quick_action: string;
  ui_elements_pt: string[];
  troubleshooting?: string;
  step_by_step_guide?: string[];
  philosophy_integration?: string;
  relevance_score: number;
  match_type: 'exact' | 'semantic' | 'synonym';
}

interface EnhancedSearchResponse {
  answer: string;
  searchResults: {
    results: EnhancedSearchResult[];
    intent: string;
    suggestions: string[];
    total_results: number;
    response_time_ms: number;
  };
  intent: string;
  suggestions: string[];
}

interface PopularEntry {
  id: number;
  title: string;
  category: string;
  difficulty_level: string;
  estimated_time: number;
  quick_action: string;
  ui_elements_pt: string[];
  user_rating: number;
  popularity_score: number;
}

export default function EnhancedSearchInterface() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EnhancedSearchResponse | null>(null);
  const [filters, setFilters] = useState<{ categories: string[] } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularContent, setPopularContent] = useState<PopularEntry[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    // Load Rubik font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    document.body.style.fontFamily = 'Rubik, sans-serif';

    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Seed enhanced data
      await fetch('/api/seed-enhanced-data', { method: 'POST' });
      
      // Load filters
      const filterResponse = await fetch('/api/filters');
      const filterData = await filterResponse.json();
      setFilters(filterData);

      // Load suggestions
      const suggestionsResponse = await fetch('/api/search/suggestions');
      const suggestionsData = await suggestionsResponse.json();
      setSuggestions(suggestionsData.suggestions || []);

      // Load popular content
      const popularResponse = await fetch('/api/knowledge/popular');
      const popularData = await popularResponse.json();
      setPopularContent(popularData.popular_entries || []);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/search/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          language: 'pt',
          category: category || undefined,
          difficulty: difficulty || undefined,
        }),
      });

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.error('Enhanced search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setCategory('');
    setDifficulty('');
    setShowFilters(false);
  };

  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'basico': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'intermediario': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'avancado': return 'text-red-400 bg-red-400/20 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'basico': return 'Básico';
      case 'intermediario': return 'Intermediário';
      case 'avancado': return 'Avançado';
      default: return level;
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'how_to': return <Target className="w-5 h-5" />;
      case 'troubleshooting': return <Zap className="w-5 h-5" />;
      case 'what_is': return <Lightbulb className="w-5 h-5" />;
      default: return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'how_to': return 'Como fazer';
      case 'troubleshooting': return 'Solução de problemas';
      case 'what_is': return 'Explicação';
      case 'where_find': return 'Onde encontrar';
      default: return 'Geral';
    }
  };

  const toggleResultExpansion = (resultId: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const submitFeedback = async (entryId: number, rating: number, helpful: boolean) => {
    try {
      await fetch(`/api/knowledge/${entryId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          helpful,
          feedback_type: 'rating'
        }),
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-zinc-900 to-black"></div>
      
      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-6 py-16">
        {/* User Profile or Login Button - Top Right */}
        <div className="absolute top-6 right-6">
          {user ? (
            <UserProfile />
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
            >
              <User className="w-4 h-4" />
              Login
            </a>
          )}
        </div>

        {/* Welcome Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <img 
                src="https://mocha-cdn.com/01985a1f-6f48-7864-ab6a-1bd92483dcb6/mc-icon.png" 
                alt="Capitão Caverna" 
                className="w-20 h-20 rounded-2xl shadow-2xl" 
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6">
            Olá! Sou o{' '}
            <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
              Capitão Caverna
            </span>
          </h1>
          
          <p className="text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Seu guia pessoal na jornada de transformação. 
            Faça qualquer pergunta sobre o Modo Caverna e receba respostas inteligentes e personalizadas.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>Assistente com IA • Busca Semântica • Filosofia da Alcatéia</span>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-white/10 shadow-2xl">
            {/* Search Input */}
            <div className="relative mb-8">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 focus-within:border-red-400 focus-within:bg-white/15 transition-all duration-300 hover:bg-white/12">
                <Search className="w-6 h-6 text-slate-300 ml-6" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua pergunta aqui... (ex: como fazer login, o que é desafio caverna)"
                  className="flex-1 px-6 py-5 bg-transparent text-white placeholder-slate-400 focus:outline-none text-lg"
                />
                {filters && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-4 text-slate-300 hover:bg-white/10 rounded-xl transition-colors mr-3 ${
                      showFilters ? 'bg-white/10 text-white' : ''
                    }`}
                    title="Filtros"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="px-8 py-5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg mr-3"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  ) : (
                    'Perguntar'
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && filters && (
              <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros de busca
                  </h3>
                  <button
                    onClick={clearFilters}
                    className="text-red-300 hover:text-white text-sm font-medium"
                  >
                    Limpar filtros
                  </button>
                </div>
                
                {/* Category Filter */}
                <div className="mb-6">
                  <label className="block text-slate-300 text-sm font-medium mb-3">Categoria</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filters.categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(category === cat ? '' : cat)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          category === cat
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                            : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {formatCategory(cat)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-3">Nível de dificuldade</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['basico', 'intermediario', 'avancado'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(difficulty === level ? '' : level)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          difficulty === level
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                            : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {getDifficultyLabel(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="space-y-8">
                {/* AI Answer */}
                <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl p-8 border border-red-400/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl">
                      {getIntentIcon(response.intent)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-xl">
                        Resposta do Capitão Caverna
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-red-300">
                          {getIntentLabel(response.intent)}
                        </span>
                        <span className="text-slate-400">
                          • {response.searchResults.response_time_ms}ms
                        </span>
                        <span className="text-slate-400">
                          • {response.searchResults.total_results} resultados
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-white/95 leading-relaxed text-lg whitespace-pre-wrap bg-white/5 rounded-xl p-6 border border-white/10">
                    {response.answer}
                  </div>
                </div>

                {/* Enhanced Search Results */}
                {response.searchResults.results.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Book className="w-6 h-6 text-blue-400" />
                      <h3 className="text-white font-semibold text-xl">
                        Documentação Detalhada
                      </h3>
                    </div>
                    <div className="grid gap-6">
                      {response.searchResults.results.map((result: EnhancedSearchResult) => {
                        const isExpanded = expandedResults.has(result.id);
                        return (
                          <div
                            key={result.id}
                            className="bg-white/5 rounded-2xl border border-white/10 hover:bg-white/8 transition-all duration-300"
                          >
                            {/* Result Header */}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold text-lg mb-2">
                                    {result.title}
                                  </h4>
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(result.difficulty_level)}`}>
                                      {getDifficultyLabel(result.difficulty_level)}
                                    </span>
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-400/30">
                                      {formatCategory(result.category)}
                                    </span>
                                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                                      <Clock className="w-4 h-4" />
                                      <span>{result.estimated_time} min</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-400 text-sm">
                                    ★ {(result.relevance_score * 5).toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action */}
                              <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-xl p-4 mb-4 border border-green-400/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="w-4 h-4 text-green-400" />
                                  <span className="text-green-300 font-medium text-sm">Ação Rápida</span>
                                </div>
                                <p className="text-white font-medium">{result.quick_action}</p>
                              </div>

                              {/* UI Elements */}
                              {result.ui_elements_pt.length > 0 && (
                                <div className="mb-4">
                                  <span className="text-purple-300 text-sm font-medium">Elementos da Interface: </span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {result.ui_elements_pt.map((element, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm border border-purple-400/30"
                                      >
                                        {element}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-slate-300 leading-relaxed">
                                {result.content_text}
                              </p>

                              {/* Expand/Collapse Button */}
                              {(result.step_by_step_guide || result.troubleshooting || result.philosophy_integration) && (
                                <button
                                  onClick={() => toggleResultExpansion(result.id)}
                                  className="flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      <span>Ver menos</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      <span>Ver detalhes completos</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="px-6 pb-6 space-y-6">
                                {/* Step by Step Guide */}
                                {result.step_by_step_guide && (
                                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                      <Target className="w-4 h-4 text-blue-400" />
                                      Passo a Passo
                                    </h5>
                                    <ol className="space-y-2">
                                      {result.step_by_step_guide.map((step, index) => (
                                        <li key={index} className="flex gap-3 text-slate-300">
                                          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                          </span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {/* Troubleshooting */}
                                {result.troubleshooting && (
                                  <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-400/20">
                                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-yellow-400" />
                                      Solução de Problemas
                                    </h5>
                                    <p className="text-slate-300 leading-relaxed">{result.troubleshooting}</p>
                                  </div>
                                )}

                                {/* Philosophy Integration */}
                                {result.philosophy_integration && (
                                  <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl p-4 border border-red-400/20">
                                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                      <Heart className="w-4 h-4 text-red-400" />
                                      Filosofia Modo Caverna
                                    </h5>
                                    <p className="text-slate-300 leading-relaxed italic">{result.philosophy_integration}</p>
                                  </div>
                                )}

                                {/* Feedback Section */}
                                {user && (
                                  <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                    <span className="text-slate-400 text-sm">Este conteúdo foi útil?</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => submitFeedback(result.id, 5, true)}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
                                      >
                                        <Heart className="w-4 h-4" />
                                        <span className="text-sm">Sim</span>
                                      </button>
                                      <button
                                        onClick={() => submitFeedback(result.id, 2, false)}
                                        className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-sm">Não</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {response.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                      Você também pode perguntar:
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {response.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setQuery(suggestion)}
                          className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl hover:bg-white/15 hover:text-white transition-all duration-200 text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Popular Content and Suggestions */}
        {!response && (
          <div className="max-w-5xl mx-auto mt-16 space-y-12">
            {/* Quick Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-white font-semibold text-2xl mb-8 text-center flex items-center justify-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  Perguntas Populares
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(suggestion)}
                      className="text-left p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 text-slate-300 hover:text-white group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full group-hover:scale-150 transition-transform"></div>
                        <span className="font-medium">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Content */}
            {popularContent.length > 0 && (
              <div>
                <h3 className="text-white font-semibold text-2xl mb-8 text-center flex items-center justify-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  Conteúdo Mais Acessado
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularContent.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-white font-semibold text-lg leading-tight">
                          {entry.title}
                        </h4>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{entry.user_rating.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getDifficultyColor(entry.difficulty_level)}`}>
                          {getDifficultyLabel(entry.difficulty_level)}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                          <Clock className="w-3 h-3" />
                          <span>{entry.estimated_time}min</span>
                        </div>
                      </div>

                      <p className="text-green-300 text-sm font-medium mb-3">
                        {entry.quick_action}
                      </p>

                      <button
                        onClick={() => setQuery(entry.title)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 rounded-lg hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 text-sm font-medium border border-red-400/30"
                      >
                        Saber mais
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

