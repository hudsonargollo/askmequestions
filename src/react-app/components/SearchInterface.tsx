import { useState, useEffect } from 'react';
import { Search, Filter, Loader2, MessageCircle, Book, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import UserProfile from './UserProfile';
import type { SearchResponse, FilterOptions, KnowledgeEntry } from '../../shared/types';

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Load Rubik font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    document.body.style.fontFamily = 'Rubik, sans-serif';

    // Load filters and populate database on mount
    const initializeApp = async () => {
      try {
        // Populate database
        await fetch('/api/populate-db', { method: 'POST' });
        
        // Load filters
        const filterResponse = await fetch('/api/filters');
        const filterData = await filterResponse.json();
        setFilters(filterData);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          language: 'pt',
          category: category || undefined,
        }),
      });

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.error('Search failed:', error);
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
    setShowFilters(false);
  };

  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const exampleQuestions = [
    'Como faço login no sistema?',
    'O que é o Desafio Caverna?',
    'Como funciona a calculadora de rituais?',
    'Onde posso ver minha agenda?',
    'Como adiciono uma nova refeição?',
    'O que é a Lei da Atração?'
  ];

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
                alt="Pergunte ao Capitão" 
                className="w-20 h-20 rounded-2xl shadow-2xl" 
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6">
            Olá! Sou o{' '}
            <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
              Capitão
            </span>
          </h1>
          
          <p className="text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Seu assistente pessoal para navegar pelo Modo Caverna. 
            Faça qualquer pergunta e receba respostas instantâneas e precisas.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>Assistente com Inteligência Artificial</span>
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
                  placeholder="Digite sua pergunta aqui..."
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
                    Filtrar por categoria
                  </h3>
                  <button
                    onClick={clearFilters}
                    className="text-red-300 hover:text-white text-sm font-medium"
                  >
                    Limpar filtros
                  </button>
                </div>
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
            )}

            {/* Response */}
            {response && (
              <div className="space-y-8">
                {/* AI Answer */}
                <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl p-8 border border-red-400/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-xl">
                        Resposta do Capitão
                      </h3>
                      <span className="text-red-300 text-sm">
                        Respondido em {response.responseTime}ms
                      </span>
                    </div>
                  </div>
                  <div className="text-white/95 leading-relaxed text-lg whitespace-pre-wrap bg-white/5 rounded-xl p-6 border border-white/10">
                    {response.answer}
                  </div>
                </div>

                {/* Relevant Entries */}
                {response.relevantEntries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Book className="w-6 h-6 text-blue-400" />
                      <h3 className="text-white font-semibold text-xl">
                        Documentação Relacionada
                      </h3>
                    </div>
                    <div className="grid gap-6">
                      {response.relevantEntries.map((entry: KnowledgeEntry) => (
                        <div
                          key={entry.id}
                          className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="text-white font-semibold text-lg">
                              {entry.feature_module} - {entry.functionality}
                            </h4>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-400/30">
                              {formatCategory(entry.category)}
                            </span>
                          </div>
                          <p className="text-slate-300 mb-4 leading-relaxed">
                            {entry.description}
                          </p>
                          {entry.ui_elements && (
                            <p className="text-purple-300 text-sm">
                              <strong>Interface: </strong>
                              {entry.ui_elements}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Example Questions */}
        {!response && (
          <div className="max-w-5xl mx-auto mt-16">
            <h3 className="text-white font-semibold text-2xl mb-8 text-center">
              Perguntas Populares
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {exampleQuestions.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="text-left p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 text-slate-300 hover:text-white group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full group-hover:scale-150 transition-transform"></div>
                    <span className="font-medium">{example}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
