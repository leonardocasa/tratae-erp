import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EntidadesList from '../../pages/Comercial/EntidadesList';
import OrdensColetaList from '../../pages/Comercial/OrdensColetaList';

const ComercialRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="entidades" replace />} />
      <Route path="entidades" element={<EntidadesList />} />
      <Route path="ordens-coleta" element={<OrdensColetaList />} />
    </Routes>
  );
};

export default ComercialRoutes;
