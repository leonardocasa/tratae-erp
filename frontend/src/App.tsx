import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import { themeConfig } from './config/theme';
import { Toaster } from 'react-hot-toast';
import QualidadeRoutes from './modules/Qualidade/QualidadeRoutes';
import ComercialRoutes from './modules/Comercial/ComercialRoutes';

const theme = createTheme(themeConfig);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={
              <MainLayout>
                <Dashboard />
              </MainLayout>
            } />
            <Route path="qualidade/*" element={
              <MainLayout>
                <QualidadeRoutes />
              </MainLayout>
            } />
            <Route path="comercial/*" element={
              <MainLayout>
                <ComercialRoutes />
              </MainLayout>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;
