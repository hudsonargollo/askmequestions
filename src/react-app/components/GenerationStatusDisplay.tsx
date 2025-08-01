import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  ExternalLink,
  Trash2,
  Eye,
  Copy,
  Share2
} from 'lucide-react';
import { ImageGenerationResponse } from '@/shared/types';

interface GenerationStatusDisplayProps {
  result: ImageGenerationResponse;
  onRetry?: () => void;
  onDelete?: (imageId: string) => void;
  className?: string;
}

export default function GenerationStatusDisplay({ 
  result, 
  onRetry, 
  onDelete,
  className = '' 
}: GenerationStatusDisplayProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(result);
  const [showFullImage, setShowFullImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Poll for status updates if generation is pending
  useEffect(() => {
    if (result.status === 'PENDING' && result.image_id && !isPolling) {
      setIsPolling(true);
      pollStatus(result.image_id);
    }
  }, [result.status, result.image_id, isPolling]);

  const pollStatus = async (imageId: string) => {
    const maxAttempts = 60; // 10 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/images/${imageId}/status`);
        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const statusData = await response.json();
        
        setCurrentStatus(prev => ({
          ...prev,
          status: statusData.status,
          public_url: statusData.public_url,
          error: statusData.error
        }));

        if (statusData.status === 'COMPLETE' || statusData.status === 'FAILED') {
          setIsPolling(false);
          return;
        }

        // Continue polling if still pending
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setIsPolling(false);
          setCurrentStatus(prev => ({
            ...prev,
            status: 'FAILED',
            error: 'Generation timed out'
          }));
        }
      } catch (err) {
        console.error('Polling error:', err);
        setIsPolling(false);
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000);
  };

  const getStatusIcon = () => {
    switch (currentStatus.status) {
      case 'COMPLETE':
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case 'FAILED':
        return <AlertCircle className="h-6 w-6 text-red-400" />;
      case 'PENDING':
      default:
        return <Clock className="h-6 w-6 text-yellow-400 animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'COMPLETE':
        return 'border-green-500 bg-green-900/20';
      case 'FAILED':
        return 'border-red-500 bg-red-900/20';
      case 'PENDING':
      default:
        return 'border-yellow-500 bg-yellow-900/20';
    }
  };

  const getStatusText = () => {
    switch (currentStatus.status) {
      case 'COMPLETE':
        return 'Generation Complete';
      case 'FAILED':
        return 'Generation Failed';
      case 'PENDING':
      default:
        return isPolling ? 'Generating...' : 'Queued for Generation';
    }
  };

  const getProgressPercentage = () => {
    switch (currentStatus.status) {
      case 'COMPLETE':
        return 100;
      case 'FAILED':
        return 0;
      case 'PENDING':
      default:
        return isPolling ? 65 : 25; // Show some progress when actively generating
    }
  };

  const handleCopyUrl = async () => {
    if (currentStatus.public_url) {
      try {
        await navigator.clipboard.writeText(currentStatus.public_url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const handleShare = async () => {
    if (currentStatus.public_url && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Generated Capitão Caverna Image',
          url: currentStatus.public_url
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      setIsPolling(false);
      onRetry();
    }
  };

  const handleDelete = () => {
    if (onDelete && currentStatus.image_id) {
      onDelete(currentStatus.image_id);
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getStatusColor()} ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-medium text-white">{getStatusText()}</h3>
            {currentStatus.image_id && (
              <p className="text-sm text-gray-300">ID: {currentStatus.image_id}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {currentStatus.status === 'FAILED' && onRetry && (
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-300 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              currentStatus.status === 'COMPLETE' 
                ? 'bg-green-400' 
                : currentStatus.status === 'FAILED'
                ? 'bg-red-400'
                : 'bg-yellow-400'
            } ${isPolling ? 'animate-pulse' : ''}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Status-specific Content */}
      {currentStatus.status === 'PENDING' && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-yellow-200">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {isPolling 
                ? 'Your image is being generated. This may take a few minutes...'
                : 'Your request has been queued for processing.'
              }
            </span>
          </div>
          {isPolling && (
            <div className="mt-2 text-xs text-gray-400">
              You can close this page and check your image history later.
            </div>
          )}
        </div>
      )}

      {currentStatus.status === 'COMPLETE' && currentStatus.public_url && (
        <div className="mb-4">
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <img
              src={currentStatus.public_url}
              alt="Generated Capitão Caverna"
              className="max-w-full h-auto rounded-lg shadow-lg cursor-pointer"
              onClick={() => setShowFullImage(true)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          
          {/* Image Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFullImage(true)}
              className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Eye className="h-4 w-4" />
              <span>View Full Size</span>
            </button>
            
            <a
              href={currentStatus.public_url}
              download={`capitao-caverna-${currentStatus.image_id}.jpg`}
              className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </a>
            
            <a
              href={currentStatus.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open</span>
            </a>
            
            <button
              onClick={handleCopyUrl}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors text-sm ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <Copy className="h-4 w-4" />
              <span>{copySuccess ? 'Copied!' : 'Copy URL'}</span>
            </button>
            
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      )}

      {currentStatus.status === 'FAILED' && (
        <div className="mb-4">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-200 font-medium">Generation Failed</span>
            </div>
            <p className="text-red-200 text-sm">
              {currentStatus.error || 'An unknown error occurred during generation.'}
            </p>
            {onRetry && (
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Image Modal */}
      {showFullImage && currentStatus.public_url && (
        <ImageModal
          imageUrl={currentStatus.public_url}
          imageId={currentStatus.image_id}
          onClose={() => setShowFullImage(false)}
        />
      )}
    </div>
  );
}

// Full Image Modal Component
interface ImageModalProps {
  imageUrl: string;
  imageId?: string;
  onClose: () => void;
}

function ImageModal({ imageUrl, imageId, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl font-bold"
        >
          ✕
        </button>
        <img
          src={imageUrl}
          alt={`Generated Capitão Caverna ${imageId || ''}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}