import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (forgotMode) {
      try {
        await api.post('/auth/forgot-password', { email });
        setForgotSent(true);
      } catch {
        setError('Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          FedEx Truck Lineup
        </h1>
        {forgotSent ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 text-green-600 p-3 rounded text-sm">
              If that email exists, a reset link has been sent. Check your inbox.
            </div>
            <button
              onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
              className="text-blue-600 hover:underline text-sm"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {!forgotMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (forgotMode ? 'Sending...' : 'Signing in...') : (forgotMode ? 'Send Reset Link' : 'Sign In')}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotMode(!forgotMode); setError(''); }}
                className="text-blue-600 hover:underline text-sm"
              >
                {forgotMode ? 'Back to Sign In' : 'Forgot password?'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
