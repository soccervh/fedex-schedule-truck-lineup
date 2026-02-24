import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface InviteUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [inviteUser, setInviteUser] = useState<InviteUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('No invite token provided.');
      return;
    }

    api
      .get(`/auth/validate-invite?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setInviteUser(res.data.user);
        if (res.data.user.phone) {
          setPhone(res.data.user.phone);
        }
        setStatus('valid');
      })
      .catch((err) => {
        setStatus('invalid');
        if (err.response?.status === 410) {
          setErrorMessage('This invite link has expired.');
        } else if (err.response?.status === 404) {
          setErrorMessage('This invite link is invalid or has already been used.');
        } else {
          setErrorMessage('Unable to validate your invite. Please try again later.');
        }
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = { token, password };
      if (phone) payload.phone = phone;

      const res = await api.post('/auth/accept-invite', payload);
      loginWithToken(res.data.token, res.data.user);
      navigate('/');
    } catch {
      setFormError('Failed to activate your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">FedEx Truck Lineup</h1>
          <p className="text-gray-500">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">FedEx Truck Lineup</h1>
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {errorMessage}
          </div>
          <p className="text-gray-500 text-sm">
            Contact your manager for a new invite link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          Welcome, {inviteUser?.name}!
        </h1>
        <p className="text-gray-500 text-center mb-6">
          Set up your account to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {formError}
            </div>
          )}

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
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Activating...' : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
