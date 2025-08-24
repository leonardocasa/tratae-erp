import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import { Toaster } from 'react-hot-toast';

// Material Dashboard 2 React themes
import theme from './assets/theme';

// Material Dashboard 2 React contexts
import { MaterialUIControllerProvider } from './context';

function App() {
  return (
    <MaterialUIControllerProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </ThemeProvider>
    </MaterialUIControllerProvider>
  );
}

export default App;
