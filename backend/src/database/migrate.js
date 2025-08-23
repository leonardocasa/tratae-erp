const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

async function runMigration() {
  try {
    console.log('🚀 Iniciando migração do banco de dados...');
    
    // Ler o arquivo de schema
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema carregado com sucesso');
    
    // Executar o schema
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: schema });
    
    if (error) {
      // Se o método RPC não existir, tentar executar via query direta
      console.log('⚠️ Método RPC não disponível, tentando execução direta...');
      
      // Dividir o schema em comandos individuais
      const commands = schema
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.trim()) {
          try {
            await supabaseAdmin.rpc('exec_sql', { sql: command + ';' });
            console.log('✅ Comando executado:', command.substring(0, 50) + '...');
          } catch (cmdError) {
            console.log('⚠️ Erro no comando:', command.substring(0, 50) + '...');
            console.log('Erro:', cmdError.message);
          }
        }
      }
    } else {
      console.log('✅ Schema executado com sucesso');
    }
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const tables = [
      'users',
      'entidades', 
      'produtos',
      'caracteristicas_fisico_quimicas',
      'produto_caracteristicas',
      'ordens_producao',
      'lotes',
      'analises_lotes',
      'analises_granulometricas',
      'ordens_coleta',
      'equipamentos',
      'equipamentos_calibracao',
      'normas_tecnicas'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabela ${table}: Erro - ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: Erro - ${err.message}`);
      }
    }
    
    console.log('🎉 Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
