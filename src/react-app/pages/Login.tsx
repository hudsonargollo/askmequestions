import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useNavigate } from 'react-router';
import Notification from '@/react-app/components/Notification';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    type: 'error',
    title: '',
    message: ''
  });
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');
    const errorResult = urlParams.get('error');

    if (authResult === 'success') {
      setNotificationData({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome! You have been successfully authenticated.'
      });
      setShowNotification(true);
      setTimeout(() => navigate('/'), 1500);
    } else if (errorResult) {
      const errorMessages: { [key: string]: { title: string; message: string } } = {
        oauth_cancelled: {
          title: 'Login Cancelled',
          message: 'Google login was cancelled. Please try again.'
        },
        oauth_failed: {
          title: 'Login Failed',
          message: 'Google login failed. Please check your connection and try again.'
        },
        oauth_not_configured: {
          title: 'Configuration Error',
          message: 'Google OAuth is not properly configured. Please contact support.'
        },
        no_code: {
          title: 'Authorization Error',
          message: 'No authorization code received from Google. Please try again.'
        },
        access_denied: {
          title: 'Access Denied',
          message: 'Your Google account is not authorized to access this application. Please contact your administrator for access.'
        }
      };
      
      const errorInfo = errorMessages[errorResult] || {
        title: 'Authentication Failed',
        message: 'An unknown error occurred during authentication.'
      };
      
      setError(errorInfo.message);
      setNotificationData({
        type: 'error',
        title: errorInfo.title,
        message: errorInfo.message
      });
      setShowNotification(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    console.log('Google login button clicked');
    setGoogleLoading(true);
    setError('');
    setShowNotification(false);
    
    try {
      console.log('Calling loginWithGoogle...');
      await loginWithGoogle();
      console.log('loginWithGoogle completed');
      // Note: loginWithGoogle redirects, so we won't reach this line normally
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to initiate Google login. Please try again.');
      setNotificationData({
        type: 'error',
        title: 'Login Error',
        message: error instanceof Error ? error.message : 'Failed to initiate Google login. Please try again.'
      });
      setShowNotification(true);
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Notification
        type={notificationData.type}
        title={notificationData.title}
        message={notificationData.message}
        show={showNotification}
        onClose={() => setShowNotification(false)}
        autoClose={notificationData.type !== 'error'}
        duration={notificationData.type === 'success' ? 2000 : 5000}
      />
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Use your authorized Google account to access the application
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {googleLoading ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                  Connecting to Google...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </div>
              )}
            </button>
            
            {/* Debug button */}
            <button
              onClick={() => {
                console.log('🔵 Test button clicked');
                console.log('🔵 loginWithGoogle function:', loginWithGoogle);
                console.log('🔵 handleGoogleLogin function:', handleGoogleLogin);
                alert('Test button works! Check console for logs.');
              }}
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              🔧 Test Button (Check Console)
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center mt-6 bg-gray-50 p-3 rounded-md border">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-4 h-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Access Restricted</span>
            </div>
            <p>Only authorized accounts can access this application.</p>
            <p>Contact your administrator if you need access.</p>
          </div>
        </div>
      </div>
    </>
  );
}