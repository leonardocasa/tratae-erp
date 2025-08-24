import React from 'react';
import { Grid } from '@mui/material';
import { Assignment, Science, Business } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Material Dashboard 2 React components
import MDBox from '../../components-template/MDBox';

// Material Dashboard 2 React example components
import DashboardLayout from '../../examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from '../../examples/Navbars/DashboardNavbar';
import Footer from '../../examples/Footer';
import ComplexStatisticsCard from '../../examples/Cards/StatisticsCards/ComplexStatisticsCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Comercial',
      description: 'Entidades e ordens de coleta',
      icon: <Business />,
      color: 'info',
      count: '150',
      path: '/comercial'
    },
    {
      title: 'Qualidade',
      description: 'Controle de qualidade e produtos',
      icon: <Science />,
      color: 'success',
      count: '75',
      path: '/qualidade'
    },
    {
      title: 'Manufatura',
      description: 'Ordens de produção e lotes',
      icon: <Assignment />,
      color: 'warning',
      count: '45',
      path: '/manufatura'
    }
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid item xs={12} md={6} lg={4} key={module.title}>
              <MDBox mb={1.5}>
                <ComplexStatisticsCard
                  color={module.color}
                  icon={module.icon}
                  title={module.title}
                  count={module.count}
                  percentage={{
                    color: "success",
                    amount: "",
                    label: module.description,
                  }}
                  onClick={() => navigate(module.path)}
                  sx={{ cursor: 'pointer' }}
                />
              </MDBox>
            </Grid>
          ))}
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
};

export default Dashboard;
