import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Lineup', show: true },
    { path: '/people', label: 'People', show: isManager },
    { path: '/timeoff', label: 'Time Off', show: isManager },
    { path: '/my-schedule', label: 'My Schedule', show: !isManager },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">
              FedEx Truck Lineup
            </h1>
            <nav className="flex items-center gap-6">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
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
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}
