import { useState } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-200"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="text-left">
          <p className="text-white font-medium text-sm">{user.name}</p>
          <p className="text-slate-300 text-xs">{user.email}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-20">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-slate-400 text-sm">{user.email}</p>
                  {user.provider && (
                    <p className="text-slate-500 text-xs capitalize">
                      via {user.provider}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}