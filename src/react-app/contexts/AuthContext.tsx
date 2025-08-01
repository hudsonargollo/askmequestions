import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider?: 'google' | 'email';
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('🔵 Starting Google login process...');
      
      const response = await fetch('/api/auth/google/url');
      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🔵 Auth URL data:', data);
      
      if (data.authUrl) {
        console.log('🔵 About to redirect to:', data.authUrl);
        console.log('🔵 Current location:', window.location.href);
        
        // Try different redirect methods
        try {
          window.location.href = data.authUrl;
          console.log('🔵 Redirect initiated with window.location.href');
        } catch (redirectError) {
          console.error('🔴 Redirect failed, trying window.open:', redirectError);
          window.open(data.authUrl, '_self');
        }
      } else {
        throw new Error('No auth URL received from server');
      }
    } catch (error) {
      console.error('🔴 Google login failed:', error);
      throw error; // Re-throw so the Login component can handle it
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}