import { useState } from 'react';
import { Plus, Upload, FileText, HelpCircle, FileX, X, Loader2, Check, LogIn } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';

interface UploadResponse {
  success: boolean;
  message: string;
  entriesAdded?: number;
}

export default function AdminModule() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'faq' | 'file'>('text');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  // Text form state
  const [textForm, setTextForm] = useState({
    feature_module: '',
    functionality: '',
    description: '',
    ui_elements: '',
    user_questions_pt: '',
    category: '',
    content_text: ''
  });

  // FAQ form state
  const [faqForm, setFaqForm] = useState({
    question_pt: '',
    answer_pt: '',
    category: ''
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState('');

  const resetForms = () => {
    setTextForm({
      feature_module: '',
      functionality: '',
      description: '',
      ui_elements: '',
      user_questions_pt: '',
      category: '',
      content_text: ''
    });
    setFaqForm({
      question_pt: '',
      answer_pt: '',
      category: ''
    });
    setSelectedFile(null);
    setFileCategory('');
    setResult(null);
  };

  const handleTextSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/add-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textForm)
      });
      const data = await response.json();
      setResult(data);
      if (data.success) resetForms();
    } catch (error) {
      setResult({ success: false, message: 'Falha ao adicionar entrada de texto' });
    } finally {
      setLoading(false);
    }
  };

  const handleFaqSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/add-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faqForm)
      });
      const data = await response.json();
      setResult(data);
      if (data.success) resetForms();
    } catch (error) {
      setResult({ success: false, message: 'Falha ao adicionar entrada de FAQ' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile || !fileCategory) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', fileCategory);

      const response = await fetch('/api/admin/upload-file', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setResult(data);
      if (data.success) resetForms();
    } catch (error) {
      setResult({ success: false, message: 'Falha ao carregar arquivo' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }

      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Tipos de arquivo suportados: TXT, PDF, DOCX');
      }
    }
  };

  // Show login button for unauthenticated users
  if (!user) {
    return (
      <a
        href="/login"
        className="fixed bottom-6 right-6 bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-full shadow-2xl transition-all duration-200 z-50 border border-zinc-600"
        title="Fazer login para acessar recursos administrativos"
      >
        <LogIn className="w-6 h-6" />
      </a>
    );
  }

  return (
    <>
      {/* Floating Admin Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-2xl transition-all duration-200 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Admin Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-zinc-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-red-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Administração - Adicionar Conhecimento</h2>
              <button
                onClick={() => { setIsOpen(false); resetForms(); }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-700">
              <div className="flex">
                {[
                  { id: 'text', label: 'Entrada de Texto', icon: FileText },
                  { id: 'faq', label: 'Perguntas Frequentes', icon: HelpCircle },
                  { id: 'file', label: 'Carregar Arquivo', icon: Upload }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                      activeTab === id
                        ? 'text-red-400 border-b-2 border-red-500'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {result && (
                <div className={`mb-6 p-4 rounded-xl border ${
                  result.success 
                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                    : 'bg-red-500/20 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {result.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {result.message}
                    {result.entriesAdded && ` (${result.entriesAdded} entradas adicionadas)`}
                  </div>
                </div>
              )}

              {/* Text Entry Tab */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Módulo de Funcionalidade</label>
                      <input
                        type="text"
                        value={textForm.feature_module}
                        onChange={(e) => setTextForm({...textForm, feature_module: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                        placeholder="ex: Autenticação"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">Funcionalidade</label>
                      <input
                        type="text"
                        value={textForm.functionality}
                        onChange={(e) => setTextForm({...textForm, functionality: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                        placeholder="ex: Login do Usuário"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Descrição</label>
                    <textarea
                      value={textForm.description}
                      onChange={(e) => setTextForm({...textForm, description: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none h-24"
                      placeholder="Descrição detalhada da funcionalidade..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Elementos da Interface</label>
                      <input
                        type="text"
                        value={textForm.ui_elements}
                        onChange={(e) => setTextForm({...textForm, ui_elements: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                        placeholder="ex: Campo de email, Campo de senha"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">Categoria</label>
                      <select
                        value={textForm.category}
                        onChange={(e) => setTextForm({...textForm, category: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                      >
                        <option value="">Selecionar categoria</option>
                        <option value="authentication">Autenticação</option>
                        <option value="dashboard">Painel</option>
                        <option value="calendar">Calendário</option>
                        <option value="community">Comunidade</option>
                        <option value="courses">Cursos</option>
                        <option value="fitness">Fitness</option>
                        <option value="finances">Finanças</option>
                        <option value="productivity">Produtividade</option>
                        <option value="goals">Metas</option>
                        <option value="manifestation">Manifestação</option>
                        <option value="referral">Indicação</option>
                        <option value="other">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Perguntas do Usuário</label>
                    <textarea
                      value={textForm.user_questions_pt}
                      onChange={(e) => setTextForm({...textForm, user_questions_pt: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none h-20"
                      placeholder="Como eu faço...? O que é...?"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Texto do Conteúdo</label>
                    <textarea
                      value={textForm.content_text}
                      onChange={(e) => setTextForm({...textForm, content_text: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none h-32"
                      placeholder="Texto completo do conteúdo para processamento da IA..."
                    />
                  </div>

                  <button
                    onClick={handleTextSubmit}
                    disabled={loading || !textForm.feature_module || !textForm.functionality}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {loading ? 'Adicionando...' : 'Adicionar Entrada de Texto'}
                  </button>
                </div>
              )}

              {/* FAQ Tab */}
              {activeTab === 'faq' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-white font-medium mb-3">Pergunta</label>
                    <input
                      type="text"
                      value={faqForm.question_pt}
                      onChange={(e) => setFaqForm({...faqForm, question_pt: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                      placeholder="Como eu faço para...?"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-3">Resposta</label>
                    <textarea
                      value={faqForm.answer_pt}
                      onChange={(e) => setFaqForm({...faqForm, answer_pt: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none h-32"
                      placeholder="Para fazer isso, você precisa..."
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Categoria</label>
                    <select
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({...faqForm, category: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Selecionar categoria</option>
                      <option value="authentication">Autenticação</option>
                      <option value="dashboard">Painel</option>
                      <option value="calendar">Calendário</option>
                      <option value="community">Comunidade</option>
                      <option value="courses">Cursos</option>
                      <option value="fitness">Fitness</option>
                      <option value="finances">Finanças</option>
                      <option value="productivity">Produtividade</option>
                      <option value="goals">Metas</option>
                      <option value="manifestation">Manifestação</option>
                      <option value="referral">Indicação</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>

                  <button
                    onClick={handleFaqSubmit}
                    disabled={loading || !faqForm.question_pt || !faqForm.answer_pt}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {loading ? 'Adicionando...' : 'Adicionar Pergunta Frequente'}
                  </button>
                </div>
              )}

              {/* File Upload Tab */}
              {activeTab === 'file' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-white font-medium mb-2">Carregar Arquivo</label>
                    <div className="border-2 border-dashed border-zinc-600 rounded-xl p-8 text-center">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".txt,.pdf,.docx,.doc"
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-4"
                      >
                        {selectedFile ? (
                          <FileText className="w-12 h-12 text-red-400" />
                        ) : (
                          <Upload className="w-12 h-12 text-zinc-400" />
                        )}
                        <div>
                          {selectedFile ? (
                            <div className="text-white">
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-zinc-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          ) : (
                            <div className="text-zinc-400">
                              <p>Clique para carregar arquivo</p>
                              <p className="text-sm">Suporta: TXT, PDF, DOCX (máx. 10MB)</p>
                            </div>
                          )}
                        </div>
                      </label>
                      {selectedFile && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="mt-4 text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto"
                        >
                          <FileX className="w-4 h-4" />
                          Remover arquivo
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Categoria</label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 text-white rounded-xl border border-zinc-600 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Selecionar categoria</option>
                      <option value="authentication">Autenticação</option>
                      <option value="dashboard">Painel</option>
                      <option value="calendar">Calendário</option>
                      <option value="community">Comunidade</option>
                      <option value="courses">Cursos</option>
                      <option value="fitness">Fitness</option>
                      <option value="finances">Finanças</option>
                      <option value="productivity">Produtividade</option>
                      <option value="goals">Metas</option>
                      <option value="manifestation">Manifestação</option>
                      <option value="referral">Indicação</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>

                  <button
                    onClick={handleFileSubmit}
                    disabled={loading || !selectedFile || !fileCategory}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    {loading ? 'Carregando...' : 'Carregar Arquivo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
