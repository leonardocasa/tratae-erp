#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando ambiente TRATAE ERP...\n');

// Verificar versões das ferramentas
function checkVersion(tool, command) {
  try {
    const version = execSync(command, { encoding: 'utf8' }).trim();
    console.log(`✅ ${tool}: ${version}`);
    return true;
  } catch (error) {
    console.log(`❌ ${tool}: Não encontrado`);
    return false;
  }
}

// Verificar se as pastas existem
function checkDirectories() {
  const requiredDirs = ['frontend', 'backend', 'database', 'docs'];
  console.log('\n📁 Verificando estrutura de pastas:');
  
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir}/`);
    } else {
      console.log(`❌ ${dir}/ - Pasta não encontrada`);
    }
  });
}

// Verificar arquivos de configuração
function checkConfigFiles() {
  const requiredFiles = [
    'package.json',
    'frontend/package.json',
    'backend/package.json',
    'frontend/.env.example',
    'backend/.env.example'
  ];
  
  console.log('\n📄 Verificando arquivos de configuração:');
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Arquivo não encontrado`);
    }
  });
}

// Verificar dependências instaladas
function checkDependencies() {
  console.log('\n📦 Verificando dependências:');
  
  try {
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (rootPackage.dependencies || rootPackage.devDependencies) {
      console.log('✅ package.json principal configurado');
    }
  } catch (error) {
    console.log('❌ package.json principal não encontrado ou inválido');
  }
  
  if (fs.existsSync('frontend/package.json')) {
    console.log('✅ Frontend package.json encontrado');
  }
  
  if (fs.existsSync('backend/package.json')) {
    console.log('✅ Backend package.json encontrado');
  }
}

// Verificar conectividade com APIs externas
async function checkExternalAPIs() {
  console.log('\n🌐 Verificando conectividade com APIs externas:');
  
  try {
    const https = require('https');
    
    // Testar conectividade com ReceitaWS
    const testReceitaWS = () => {
      return new Promise((resolve) => {
        const req = https.get('https://receitaws.com.br', (res) => {
          if (res.statusCode === 200) {
            console.log('✅ ReceitaWS: Acessível');
            resolve(true);
          } else {
            console.log('⚠️ ReceitaWS: Status inesperado');
            resolve(false);
          }
        });
        
        req.on('error', () => {
          console.log('❌ ReceitaWS: Não acessível');
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          console.log('⏰ ReceitaWS: Timeout');
          resolve(false);
        });
      });
    };
    
    await testReceitaWS();
  } catch (error) {
    console.log('❌ Erro ao verificar APIs externas');
  }
}

// Função principal
async function main() {
  console.log('='.repeat(50));
  console.log('🔧 VERIFICAÇÃO DE AMBIENTE TRATAE ERP');
  console.log('='.repeat(50));
  
  // Verificar versões
  console.log('\n🛠️ Verificando versões das ferramentas:');
  checkVersion('Node.js', 'node --version');
  checkVersion('npm', 'npm --version');
  checkVersion('Yarn', 'yarn --version');
  
  // Verificar estrutura
  checkDirectories();
  checkConfigFiles();
  checkDependencies();
  
  // Verificar APIs
  await checkExternalAPIs();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Verificação concluída!');
  console.log('='.repeat(50));
  
  console.log('\n📋 Próximos passos:');
  console.log('1. Configure as variáveis de ambiente (.env)');
  console.log('2. Execute: yarn install:all');
  console.log('3. Execute: yarn dev');
  console.log('\n🚀 Sistema pronto para desenvolvimento!');
}

// Executar verificação
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
