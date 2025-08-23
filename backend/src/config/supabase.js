const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
}

// Cliente para operações do usuário (com permissões limitadas)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Cliente para operações administrativas (com permissões completas)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Função para verificar conexão
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Aviso: Tabela users ainda não criada');
      return true; // Não é erro crítico se a tabela não existir ainda
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error.message);
    return false;
  }
}

// Função para obter cliente baseado no contexto
function getClient(isAdmin = false) {
  return isAdmin ? supabaseAdmin : supabase;
}

module.exports = {
  supabase,
  supabaseAdmin,
  getClient,
  testConnection
};
