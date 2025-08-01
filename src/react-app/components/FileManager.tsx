import { useState, useEffect } from 'react';
import { FileText, Trash2, Calendar, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';

interface UploadedFile {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  minio_key: string;
  category: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_result: string | null;
  created_at: string;
  updated_at: string;
}

export default function FileManager() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/admin/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFiles(files.filter(f => f.id !== fileId));
      } else {
        alert('Erro ao excluir arquivo');
      }
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      alert('Erro ao excluir arquivo');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Processado com sucesso';
      case 'failed':
        return 'Falha no processamento';
      case 'processing':
        return 'Processando...';
      default:
        return 'Aguardando processamento';
    }
  };

  const getCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'authentication': 'Autenticação',
      'dashboard': 'Painel',
      'calendar': 'Calendário',
      'community': 'Comunidade',
      'courses': 'Cursos',
      'fitness': 'Fitness',
      'finances': 'Finanças',
      'productivity': 'Produtividade',
      'goals': 'Metas',
      'manifestation': 'Manifestação',
      'referral': 'Indicação',
      'other': 'Outros'
    };
    return categoryMap[category] || category;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categories = [
    { value: 'authentication', label: 'Autenticação' },
    { value: 'dashboard', label: 'Painel' },
    { value: 'calendar', label: 'Calendário' },
    { value: 'community', label: 'Comunidade' },
    { value: 'courses', label: 'Cursos' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'finances', label: 'Finanças' },
    { value: 'productivity', label: 'Produtividade' },
    { value: 'goals', label: 'Metas' },
    { value: 'manifestation', label: 'Manifestação' },
    { value: 'referral', label: 'Indicação' },
    { value: 'other', label: 'Outros' }
  ];

  const filteredFiles = selectedCategory 
    ? files.filter(f => f.category === selectedCategory)
    : files;

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-zinc-900 rounded-3xl border border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-red-400" />
          Arquivos Carregados
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-600 focus:border-red-500 focus:outline-none"
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <span className="text-zinc-400 text-sm">
            {filteredFiles.length} arquivo{filteredFiles.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin"></div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum arquivo encontrado</p>
          <p className="text-sm">Faça upload de arquivos usando o botão de Administração</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-10 h-10 text-red-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">
                      {file.original_name}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
                      <span className="bg-zinc-700 px-2 py-1 rounded-md">
                        {getCategoryName(file.category)}
                      </span>
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusIcon(file.processing_status)}
                      <span className="text-xs text-zinc-400">
                        {getStatusText(file.processing_status)}
                      </span>
                    </div>
                    {file.extraction_result && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        {file.extraction_result}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
