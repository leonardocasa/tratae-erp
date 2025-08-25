import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isLoading, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha no login');
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    return () => clearError();
  }, [isAuthenticated, navigate, clearError]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Entrar</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField fullWidth label="E-mail" type="email" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField fullWidth label="Senha" type="password" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" disabled={isLoading} sx={{ mt: 2 }}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
