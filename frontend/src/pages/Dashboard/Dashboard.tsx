import React from 'react';

const Dashboard: React.FC = () => {
  console.log('🔍 Dashboard: Teste simples iniciado');

  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: '#ff0000', 
      color: 'white', 
      fontSize: '32px',
      textAlign: 'center',
      minHeight: '100vh'
    }}>
      <h1>🚨 TESTE DE DEPLOY - VERMELHO</h1>
      <p>Se você está vendo isso, o deploy está funcionando!</p>
      <p>Data/Hora: {new Date().toLocaleString()}</p>
      <p>Commit: ed41f59</p>
      <div style={{ 
        backgroundColor: 'yellow', 
        color: 'black', 
        padding: '20px', 
        margin: '20px',
        borderRadius: '10px'
      }}>
        <h2>🎯 SE VOCÊ VÊ ISSO, O DEPLOY ESTÁ FUNCIONANDO!</h2>
      </div>
    </div>
  );
};

export default Dashboard;
