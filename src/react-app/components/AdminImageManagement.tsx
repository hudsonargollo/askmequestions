import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { 
  Users, 
  Image as ImageIcon, 
  BarChart3, 
  Settings, 
  Trash2, 
  RefreshCw,
  Download,
  Eye,
  Search,
  Filter,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { GeneratedImageRecord, ImageGenerationParams } from '@/shared/types';

interface AdminStats {
  totalImages: number;
  pendingImages: number;
  completeImages: number;
  failedImages: number;
  cacheEntries: number;
  avgGenerationTime: number;
  topGenerators: Array<{
    user_id: string;
    total_images: number;
    successful_images: number;
    avg_generation_time: number;
    last_generation: string;
  }>;
  recentActivity: Array<{
    image_id: string;
    user_id: string;
    status: string;
    created_at: string;
    generation_time_ms: number;
    service_used: string;
  }>;
  serviceStats: Record<string, {
    usage_count: number;
    avg_generation_time: number;
    successful_count: number;
    failed_count: number;
    success_rate: number;
  }>;
}

export default function AdminImageManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'users' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [images, setImages] = useState<GeneratedImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETE' | 'FAILED'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);

  const imagesPerPage = 20;

  useEffect(() => {
    if (user?.isAdmin) {
      loadData();
    }
  }, [user?.isAdmin, activeTab, currentPage, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'overview') {
        await loadStats();
      } else if (activeTab === 'images') {
        await loadAllImages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const response = await fetch('/api/v1/admin/images/stats');
    if (!response.ok) {
      throw new Error('Failed to load statistics');
    }
    const data = await response.json();
    setStats(data);
  };

  const loadAllImages = async () => {
    const params = new URLSearchParams({
      limit: imagesPerPage.toString(),
      offset: ((currentPage - 1) * imagesPerPage).toString()
    });

    if (statusFilter !== 'all') {
      params.append('status', statusFilter);
    }

    const response = await fetch(`/api/v1/admin/images?${params}`);
    if (!response.ok) {
      throw new Error('Failed to load images');
    }
    
    const data = await response.json();
    setImages(data.images || []);
    setTotalImages(data.total || 0);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
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
      
      // Reload stats if on overview tab
      if (activeTab === 'overview') {
        loadStats();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handleCleanupFailed = async () => {
    if (!confirm('This will delete all failed images older than 7 days. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/v1/admin/images/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ daysOld: 7, type: 'failed' })
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup images');
      }

      const result = await response.json();
      alert(`Cleaned up ${result.deletedCount} failed images`);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cleanup images');
    }
  };

  const filteredImages = images.filter(image => {
    if (!searchQuery) return true;
    
    const params = JSON.parse(image.prompt_parameters) as ImageGenerationParams;
    const searchLower = searchQuery.toLowerCase();
    
    return (
      image.image_id.toLowerCase().includes(searchLower) ||
      image.user_id.toLowerCase().includes(searchLower) ||
      params.pose?.toLowerCase().includes(searchLower) ||
      params.outfit?.toLowerCase().includes(searchLower) ||
      params.footwear?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalImages / imagesPerPage);

  if (!user?.isAdmin) {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-200">Access Denied</h3>
            <p className="text-red-300">You need administrator privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Image Management</h2>
          </div>
          
          <button
            onClick={loadData}
            className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'images', label: 'All Images', icon: ImageIcon },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-gray-300">Loading...</span>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <OverviewTab stats={stats} onCleanup={handleCleanupFailed} />
            )}

            {activeTab === 'images' && (
              <ImagesTab
                images={filteredImages}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onDeleteImage={handleDeleteImage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

            {activeTab === 'users' && (
              <UsersTab />
            )}

            {activeTab === 'settings' && (
              <SettingsTab onCleanup={handleCleanupFailed} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
interface OverviewTabProps {
  stats: AdminStats;
  onCleanup: () => void;
}

function OverviewTab({ stats, onCleanup }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Images"
          value={stats.totalImages}
          icon={ImageIcon}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={stats.pendingImages}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Complete"
          value={stats.completeImages}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Failed"
          value={stats.failedImages}
          icon={X}
          color="red"
        />
      </div>

      {/* Service Statistics */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Server className="h-5 w-5 mr-2" />
          Service Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.serviceStats).map(([service, serviceStats]) => (
            <div key={service} className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 capitalize">{service}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Usage:</span>
                  <span className="text-white">{serviceStats.usage_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Success Rate:</span>
                  <span className="text-white">{serviceStats.success_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Avg Time:</span>
                  <span className="text-white">{(serviceStats.avg_generation_time / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Generators */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Top Generators
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 text-gray-300">User ID</th>
                <th className="text-left py-2 text-gray-300">Total Images</th>
                <th className="text-left py-2 text-gray-300">Success Rate</th>
                <th className="text-left py-2 text-gray-300">Avg Time</th>
                <th className="text-left py-2 text-gray-300">Last Generation</th>
              </tr>
            </thead>
            <tbody>
              {stats.topGenerators.map((generator) => (
                <tr key={generator.user_id} className="border-b border-gray-700">
                  <td className="py-2 text-white font-mono text-xs">{generator.user_id}</td>
                  <td className="py-2 text-white">{generator.total_images}</td>
                  <td className="py-2 text-white">
                    {Math.round((generator.successful_images / generator.total_images) * 100)}%
                  </td>
                  <td className="py-2 text-white">
                    {generator.avg_generation_time ? (generator.avg_generation_time / 1000).toFixed(1) + 's' : 'N/A'}
                  </td>
                  <td className="py-2 text-white">
                    {new Date(generator.last_generation).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Activity
        </h3>
        <div className="space-y-2">
          {stats.recentActivity.slice(0, 10).map((activity) => (
            <div key={activity.image_id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'COMPLETE' ? 'bg-green-400' :
                  activity.status === 'FAILED' ? 'bg-red-400' :
                  'bg-yellow-400'
                }`} />
                <span className="text-white font-mono text-xs">{activity.image_id}</span>
                <span className="text-gray-300 text-sm">by {activity.user_id}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>{activity.service_used || 'N/A'}</span>
                <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onCleanup}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Cleanup Failed Images</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Images Tab Component
interface ImagesTabProps {
  images: GeneratedImageRecord[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'PENDING' | 'COMPLETE' | 'FAILED';
  onStatusFilterChange: (status: 'all' | 'PENDING' | 'COMPLETE' | 'FAILED') => void;
  onDeleteImage: (imageId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function ImagesTab({ 
  images, 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange, 
  onDeleteImage,
  currentPage,
  totalPages,
  onPageChange
}: ImagesTabProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by image ID, user ID, or parameters..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
            className="bg-gray-800 border border-gray-600 rounded-md text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETE">Complete</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Images List */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-300">Image</th>
                <th className="text-left py-3 px-4 text-gray-300">ID</th>
                <th className="text-left py-3 px-4 text-gray-300">User</th>
                <th className="text-left py-3 px-4 text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-gray-300">Created</th>
                <th className="text-left py-3 px-4 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => (
                <AdminImageRow
                  key={image.image_id}
                  image={image}
                  onDelete={() => onDeleteImage(image.image_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Admin Image Row Component
interface AdminImageRowProps {
  image: GeneratedImageRecord;
  onDelete: () => void;
}

function AdminImageRow({ image, onDelete }: AdminImageRowProps) {
  
  return (
    <tr className="border-b border-gray-700 hover:bg-gray-700/30">
      <td className="py-3 px-4">
        <div className="w-12 h-12 bg-gray-900 rounded-lg flex-shrink-0">
          {image.status === 'COMPLETE' && image.public_url ? (
            <img
              src={image.public_url}
              alt="Generated"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-lg">
              {image.status === 'PENDING' ? (
                <Clock className="h-4 w-4 text-yellow-400" />
              ) : (
                <X className="h-4 w-4 text-red-400" />
              )}
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-white font-mono text-xs">{image.image_id}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-white font-mono text-xs">{image.user_id}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          image.status === 'COMPLETE' ? 'bg-green-600 text-white' :
          image.status === 'FAILED' ? 'bg-red-600 text-white' :
          'bg-yellow-600 text-white'
        }`}>
          {image.status}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-gray-300">{new Date(image.created_at).toLocaleDateString()}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          {image.status === 'COMPLETE' && image.public_url && (
            <>
              <a
                href={image.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-blue-400 hover:text-blue-300"
              >
                <Eye className="h-4 w-4" />
              </a>
              <a
                href={image.public_url}
                download={`capitao-caverna-${image.image_id}.jpg`}
                className="p-1 text-gray-400 hover:text-gray-300"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Users Tab Component
function UsersTab() {
  return (
    <div className="text-center py-12">
      <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-300 mb-2">User Management</h3>
      <p className="text-gray-400">
        User management features will be implemented in a future update.
      </p>
    </div>
  );
}

// Settings Tab Component
interface SettingsTabProps {
  onCleanup: () => void;
}

function SettingsTab({ onCleanup }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">System Maintenance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Cleanup Failed Images</h4>
              <p className="text-sm text-gray-400">Remove failed images older than 7 days</p>
            </div>
            <button
              onClick={onCleanup}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Cleanup</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Configuration</h3>
        <p className="text-gray-400">
          Advanced configuration options will be available in a future update.
        </p>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}