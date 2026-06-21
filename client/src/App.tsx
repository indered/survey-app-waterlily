import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminHome } from './pages/AdminHome';
import { AuthPage } from './pages/AuthPage';
import { CreateSurveyPage } from './pages/CreateSurveyPage';
import { AdminSurveyPage } from './pages/AdminSurveyPage';
import { AdminSurveySubmissionsPage } from './pages/AdminSurveySubmissionsPage';
import { SurveyViewPage } from './pages/SurveyViewPage';
import HealthCheck from './components/HealthCheck';
import type { ReactNode } from 'react';
import { CircularProgress, Container, Stack, Typography } from '@mui/material';

function ProtectedRoute({
  children,
  requireAdmin
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading app...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const homeTarget = isAuthenticated && user?.role === 'admin' ? '/home' : '/auth';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homeTarget} replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/health" element={<HealthCheck />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute requireAdmin>{<AdminHome />}</ProtectedRoute>
        }
      />
      <Route
        path="/home/create"
        element={
          <ProtectedRoute requireAdmin>{<CreateSurveyPage />}</ProtectedRoute>
        }
      />
      <Route
        path="/home/surveys/:friendlyUrl"
        element={
          <ProtectedRoute requireAdmin>{<AdminSurveyPage />}</ProtectedRoute>
        }
      />
      <Route
        path="/home/surveys/:friendlyUrl/edit"
        element={
          <ProtectedRoute requireAdmin>{<CreateSurveyPage />}</ProtectedRoute>
        }
      />
      <Route
        path="/home/surveys/:friendlyUrl/submissions"
        element={
          <ProtectedRoute requireAdmin>{<AdminSurveySubmissionsPage />}</ProtectedRoute>
        }
      />
      <Route path="/survey/:friendlyUrl" element={<SurveyViewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
