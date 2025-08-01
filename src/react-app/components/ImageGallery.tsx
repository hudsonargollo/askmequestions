import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { 
  Grid, 
  List, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw,
  Calendar,
  Clock,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { GeneratedImageRecord, ImageGenerationParams } from '@/shared/types';

interface ImageGalleryProps {
  userId?: string;
  showDeleteActions?: boolean;
  className?: string;
}

interface FilterOptions {
  status: 'all' | 'PENDING' | 'COMPLETE' | 'FAILED';
  pose: string;
  outfit: string;
  footwear: string;
  prop: string;
  frameType: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function ImageGallery({ 
  userId, 
  showDeleteActions = false,
  className = '' 
}: ImageGalleryProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<GeneratedImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    pose: '',
    outfit: '',
    footwear: '',
    prop: '',
    frameType: '',
    dateRange: 'all'
  });

  const imagesPerPage = 20;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadImages();
    }
  }, [targetUserId, currentPage, filters]);

  const loadImages = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: imagesPerPage.toString(),
        offset: ((currentPage - 1) * imagesPerPage).toString()
      });

      // Add filters to params
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/v1/images/user/${targetUserId}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load images');
      }

      const data = await response.json();
      setImages(data.images || []);
      setTotalImages(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/images/${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Remove from local state
      setImages(prev => prev.filter(img => img.image_id !== imageId));
      setTotalImages(prev => prev - 1);
      
      // Close modal if this image was selected
      if (selectedImage?.image_id === imageId) {
        setSelectedImage(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handleRetry = async (imageId: string) => {
    try {
      const image = images.find(img => img.image_id === imageId);
      if (!image) return;

      const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;
      
      const response = await fetch('/api/v1/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params })
      });

      if (!response.ok) {
        throw new Error('Failed to retry generation');
      }

      // Reload images to show new generation
      loadImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry generation');
    }
  };

  const filteredImages = images.filter(image => {
    if (searchQuery) {
      const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;
      const searchLower = searchQuery.toLowerCase();
      
      return (
        params.pose?.toLowerCase().includes(searchLower) ||
        params.outfit?.toLowerCase().includes(searchLower) ||
        params.footwear?.toLowerCase().includes(searchLower) ||
        params.prop?.toLowerCase().includes(searchLower) ||
        image.image_id.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(totalImages / imagesPerPage);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-300">Loading images...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-900/30 border border-red-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <X className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-200">{error}</span>
        </div>
        <button
          onClick={loadImages}
          className="mt-3 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Generated Images</h2>
            <span className="text-sm text-gray-400">({totalImages} total)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
            
            <button
              onClick={loadImages}
              className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by pose, outfit, footwear, prop, or image ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md text-white text-sm p-2"
                >
                  <option value="all">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md text-white text-sm p-2"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Images Found</h3>
            <p className="text-gray-400">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Generate your first Capitão Caverna image to get started'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Images Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <ImageCard
                    key={image.image_id}
                    image={image}
                    onView={() => setSelectedImage(image)}
                    onDelete={showDeleteActions ? () => handleDelete(image.image_id) : undefined}
                    onRetry={image.status === 'FAILED' ? () => handleRetry(image.image_id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredImages.map((image) => (
                  <ImageListItem
                    key={image.image_id}
                    image={image}
                    onView={() => setSelectedImage(image)}
                    onDelete={showDeleteActions ? () => handleDelete(image.image_id) : undefined}
                    onRetry={image.status === 'FAILED' ? () => handleRetry(image.image_id) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDelete={showDeleteActions ? () => handleDelete(selectedImage.image_id) : undefined}
          onRetry={selectedImage.status === 'FAILED' ? () => handleRetry(selectedImage.image_id) : undefined}
        />
      )}
    </div>
  );
}

// Image Card Component for Grid View
interface ImageCardProps {
  image: GeneratedImageRecord;
  onView: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

function ImageCard({ image, onView, onDelete, onRetry }: ImageCardProps) {
  const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;
  
  const getStatusColor = () => {
    switch (image.status) {
      case 'COMPLETE': return 'border-green-500';
      case 'FAILED': return 'border-red-500';
      case 'PENDING': return 'border-yellow-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className={`bg-gray-800/50 border rounded-lg overflow-hidden hover:bg-gray-800/70 transition-colors ${getStatusColor()}`}>
      {/* Image */}
      <div className="aspect-square bg-gray-900 relative">
        {image.status === 'COMPLETE' && image.public_url ? (
          <img
            src={image.public_url}
            alt="Generated Capitão Caverna"
            className="w-full h-full object-cover cursor-pointer"
            onClick={onView}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {image.status === 'PENDING' ? (
              <Clock className="h-8 w-8 text-yellow-400 animate-pulse" />
            ) : (
              <X className="h-8 w-8 text-red-400" />
            )}
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
          image.status === 'COMPLETE' ? 'bg-green-600 text-white' :
          image.status === 'FAILED' ? 'bg-red-600 text-white' :
          'bg-yellow-600 text-white'
        }`}>
          {image.status}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-sm text-gray-300 mb-2">
          <div className="font-medium">{params.pose}</div>
          <div className="text-xs text-gray-400">
            {params.outfit} • {params.footwear}
            {params.prop && ` • ${params.prop}`}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{new Date(image.created_at).toLocaleDateString()}</span>
          <div className="flex space-x-1">
            <button
              onClick={onView}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Eye className="h-3 w-3" />
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 hover:bg-gray-700 rounded text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Image List Item Component for List View
function ImageListItem({ image, onView, onDelete, onRetry }: ImageCardProps) {
  const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;
  
  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center space-x-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 bg-gray-900 rounded-lg flex-shrink-0 relative">
          {image.status === 'COMPLETE' && image.public_url ? (
            <img
              src={image.public_url}
              alt="Generated Capitão Caverna"
              className="w-full h-full object-cover rounded-lg cursor-pointer"
              onClick={onView}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg">
              {image.status === 'PENDING' ? (
                <Clock className="h-6 w-6 text-yellow-400 animate-pulse" />
              ) : (
                <X className="h-6 w-6 text-red-400" />
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-white font-medium truncate">{params.pose}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              image.status === 'COMPLETE' ? 'bg-green-600 text-white' :
              image.status === 'FAILED' ? 'bg-red-600 text-white' :
              'bg-yellow-600 text-white'
            }`}>
              {image.status}
            </span>
          </div>
          
          <div className="text-sm text-gray-300 mb-1">
            {params.outfit} • {params.footwear}
            {params.prop && ` • ${params.prop}`}
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(image.created_at).toLocaleDateString()}</span>
            </span>
            {image.generation_time_ms && (
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{(image.generation_time_ms / 1000).toFixed(1)}s</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          {image.status === 'COMPLETE' && image.public_url && (
            <a
              href={image.public_url}
              download={`capitao-caverna-${image.image_id}.jpg`}
              className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Image Detail Modal Component
interface ImageDetailModalProps {
  image: GeneratedImageRecord;
  onClose: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

function ImageDetailModal({ image, onClose, onDelete, onRetry }: ImageDetailModalProps) {
  const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;

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
      <div className="bg-gray-900 rounded-lg max-w-4xl max-h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Image Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image */}
            <div>
              {image.status === 'COMPLETE' && image.public_url ? (
                <img
                  src={image.public_url}
                  alt="Generated Capitão Caverna"
                  className="w-full rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                  {image.status === 'PENDING' ? (
                    <div className="text-center">
                      <Clock className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-300">Generation in progress...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <p className="text-gray-300">Generation failed</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Parameters</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pose:</span>
                    <span className="text-white">{params.pose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Outfit:</span>
                    <span className="text-white">{params.outfit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Footwear:</span>
                    <span className="text-white">{params.footwear}</span>
                  </div>
                  {params.prop && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prop:</span>
                      <span className="text-white">{params.prop}</span>
                    </div>
                  )}
                  {params.frameType && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frame Type:</span>
                      <span className="text-white">{params.frameType}</span>
                    </div>
                  )}
                  {params.frameId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frame ID:</span>
                      <span className="text-white">{params.frameId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Generation Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-medium ${
                      image.status === 'COMPLETE' ? 'text-green-400' :
                      image.status === 'FAILED' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {image.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">
                      {new Date(image.created_at).toLocaleString()}
                    </span>
                  </div>
                  {image.generation_time_ms && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Generation Time:</span>
                      <span className="text-white">
                        {(image.generation_time_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                  {image.service_used && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white">{image.service_used}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Image ID:</span>
                    <span className="text-white font-mono text-xs">{image.image_id}</span>
                  </div>
                </div>
              </div>

              {image.error_message && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Error</h3>
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                    <p className="text-red-200 text-sm">{image.error_message}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4">
                {image.status === 'COMPLETE' && image.public_url && (
                  <>
                    <a
                      href={image.public_url}
                      download={`capitao-caverna-${image.image_id}.jpg`}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </a>
                    
                    <a
                      href={image.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Open</span>
                    </a>
                  </>
                )}
                
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}