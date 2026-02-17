import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

export type AccessLevel = 'HIGHEST_MANAGER' | 'OP_LEAD' | 'TRUCK_MOVER' | 'EMPLOYEE';

const ACCESS_HIERARCHY: AccessLevel[] = ['HIGHEST_MANAGER', 'OP_LEAD', 'TRUCK_MOVER', 'EMPLOYEE'];

interface User {
  id: string;
  email: string;
  name: string;
  role: 'MANAGER' | 'DRIVER' | 'SWING' | 'CSA' | 'HANDLER';
  homeArea: 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';
  accessLevel: AccessLevel;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  isManager: boolean;
  isOpLead: boolean;
  isTruckMover: boolean;
  accessLevel: AccessLevel | null;
  hasAccess: (level: AccessLevel) => boolean;
}

function hasAccessLevel(userLevel: AccessLevel | undefined, requiredLevel: AccessLevel): boolean {
  if (!userLevel) return false;
  return ACCESS_HIERARCHY.indexOf(userLevel) <= ACCESS_HIERARCHY.indexOf(requiredLevel);
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const loginWithToken = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const hasAccess = useCallback(
    (level: AccessLevel) => hasAccessLevel(user?.accessLevel, level),
    [user?.accessLevel]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithToken,
        logout,
        isManager: hasAccessLevel(user?.accessLevel, 'HIGHEST_MANAGER'),
        isOpLead: hasAccessLevel(user?.accessLevel, 'OP_LEAD'),
        isTruckMover: hasAccessLevel(user?.accessLevel, 'TRUCK_MOVER'),
        accessLevel: user?.accessLevel || null,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
