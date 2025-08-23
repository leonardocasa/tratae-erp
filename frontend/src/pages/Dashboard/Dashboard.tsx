import React from 'react';
import { Container, Paper, Typography, Grid, Card, CardContent, CardActions, Button, Box } from '@mui/material';
import { Assignment, Science, Business } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Comercial',
      description: 'Entidades e ordens de coleta',
      icon: <Business sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      path: '/comercial'
    },
    {
      title: 'Qualidade',
      description: 'Controle de qualidade, produtos e características físico-químicas',
      icon: <Science sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      path: '/qualidade'
    },
    {
      title: 'Manufatura',
      description: 'Ordens de produção e acompanhamento de lotes',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      path: '/manufatura'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Bem-vindo ao TRATAE ERP
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sistema integrado para gestão de produção e comercialização
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module.title}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => navigate(module.path)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                <Box sx={{ color: module.color, mb: 2 }}>
                  {module.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {module.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {module.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="contained" 
                  size="small"
                  sx={{ bgcolor: module.color }}
                >
                  Acessar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;
