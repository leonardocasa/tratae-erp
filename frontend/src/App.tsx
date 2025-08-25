import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import OrdensKanban from './pages/Comercial/OrdensKanban';
import EntidadesList from './pages/Comercial/EntidadesList';
import { Toaster } from 'react-hot-toast';

// Material Dashboard 2 React themes
import theme from './assets/theme';

// Material Dashboard 2 React contexts
import { MaterialUIControllerProvider, AuthContextProvider } from './context';

// Auth store and protected route
import { useAuthStore } from './stores/authStore';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  const verifyToken = useAuthStore((s) => s.verifyToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const LoginRoute = () => (isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />);

  return (
    <MaterialUIControllerProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthContextProvider>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/comercial/ordens" element={<OrdensKanban />} />
                <Route path="/comercial/entidades" element={<EntidadesList />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthContextProvider>
        </Router>
        <Toaster position="top-right" />
      </ThemeProvider>
    </MaterialUIControllerProvider>
  );
}

export default App;
