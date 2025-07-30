import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate('/');
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-gradient-to-r from-red-600 to-red-600 p-4 rounded-2xl shadow-2xl mb-6 inline-block">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Authenticating...</h1>
        <p className="text-slate-300">Please wait while we complete your login.</p>
      </div>
    </div>
  );
}
