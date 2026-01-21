import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Lineup } from './pages/Lineup';
import { People } from './pages/People';
import { TimeOff } from './pages/TimeOff';
import { MySchedule } from './pages/MySchedule';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Lineup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <People />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeoff"
        element={
          <ProtectedRoute>
            <TimeOff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-schedule"
        element={
          <ProtectedRoute>
            <MySchedule />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
