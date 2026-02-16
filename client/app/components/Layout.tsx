import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Home } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: pendingData } = useQuery({
    queryKey: ['timeoff-pending-count'],
    queryFn: async () => {
      const res = await api.get('/timeoff/pending-count');
      return res.data;
    },
    enabled: isManager,
    refetchInterval: 60000,
  });

  const pendingCount = pendingData?.count ?? 0;

  const navItems = [
    { path: '/', label: 'Home', show: true },
    { path: '/facility', label: 'Facility', show: true },
    { path: '/truck-lineup', label: 'Truck Lineup', show: true },
    { path: '/routes', label: 'Routes', show: isManager },
    { path: '/people', label: 'People', show: isManager },
    { path: '/timeoff', label: 'Time Off', show: isManager, badge: pendingCount },
    { path: '/my-schedule', label: 'My Schedule', show: !isManager },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/" className="text-gray-600 hover:text-blue-600">
                <Home size={22} />
              </Link>
              <h1 className="text-lg font-bold text-gray-900">
                FedEx
              </h1>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden border-t pb-3">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-2 px-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              <div className="flex items-center justify-between px-2 pt-2 mt-2 border-t">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-4 px-3 md:py-6 md:px-4">{children}</main>
    </div>
  );
}
