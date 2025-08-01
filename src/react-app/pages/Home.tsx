import { useAuth } from '@/react-app/contexts/AuthContext';
import { Link } from 'react-router';
import EnhancedSearchInterface from '../components/EnhancedSearchInterface';
import AdminModule from '../components/AdminModule';
import FileManager from '../components/FileManager';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation */}
      <div className="fixed top-4 right-4 z-50 flex space-x-3">
        {user && (
          <Link
            to="/image-generation"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
          >
            Generate Images
          </Link>
        )}
        {user && user.isAdmin && (
          <Link
            to="/admin"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg"
          >
            Admin Panel
          </Link>
        )}
      </div>
      
      <EnhancedSearchInterface />
      
      {/* File Manager for authenticated users */}
      {user && (
        <div className="mt-8">
          <FileManager />
        </div>
      )}
      
      <AdminModule />
    </>
  );
}
