import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProdutosList from '../../pages/Qualidade/ProdutosList';
import CaracteristicasList from '../../pages/Qualidade/CaracteristicasList';

const QualidadeRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="produtos" replace />} />
      <Route path="produtos" element={<ProdutosList />} />
      <Route path="caracteristicas" element={<CaracteristicasList />} />
    </Routes>
  );
};

export default QualidadeRoutes;
