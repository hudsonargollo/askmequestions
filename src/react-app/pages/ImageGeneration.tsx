import { useState } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { Link } from 'react-router';
import ImageGenerationInterface from '@/react-app/components/ImageGenerationInterface';
import GenerationStatusDisplay from '@/react-app/components/GenerationStatusDisplay';
import ImageGallery from '@/react-app/components/ImageGallery';
import { ImageGenerationParams, ImageGenerationResponse } from '@/shared/types';
import { ArrowLeft, AlertCircle, Image as ImageIcon, History } from 'lucide-react';

export default function ImageGeneration() {
  const { user, loading } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<ImageGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  const handleGenerate = async (params: ImageGenerationParams) => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const response = await fetch('/api/v1/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ params }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result: ImageGenerationResponse = await response.json();
      setGenerationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setGenerationResult(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-6">Please log in to access the image generation feature.</p>
          <Link
            to="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-600"></div>
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-6 w-6 text-blue-400" />
                <h1 className="text-xl font-bold text-white">
                  Capitão Caverna Image Generator
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'generate'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Generate
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>
              </div>
              
              <div className="h-6 w-px bg-gray-600"></div>
              
              <span className="text-gray-300">Welcome, {user.name}</span>
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'generate' ? (
          <>
            {/* Generation Result */}
            {generationResult && (
              <div className="mb-6">
                <GenerationStatusDisplay 
                  result={generationResult} 
                  onRetry={handleRetry}
                />
              </div>
            )}

            {/* Image Generation Interface */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-gray-700">
              <ImageGenerationInterface
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          </>
        ) : (
          /* Image History */
          <ImageGallery 
            userId={user.id}
            showDeleteActions={user.isAdmin}
            className="bg-white/5 backdrop-blur-sm"
          />
        )}
      </div>
    </div>
  );
}

