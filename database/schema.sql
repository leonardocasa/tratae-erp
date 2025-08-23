-- =====================================================
-- SCHEMA DO BANCO DE DADOS - TRATAE ERP
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('master', 'comercial', 'manufatura', 'qualidade')),
    sector VARCHAR(50) NOT NULL CHECK (sector IN ('comercial', 'manufatura', 'qualidade')),
    permissions TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ENTIDADES (CLIENTES, FORNECEDORES, TRANSPORTADORAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS entidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cliente', 'fornecedor', 'transportadora')),
    inscricao_estadual VARCHAR(50),
    inscricao_municipal VARCHAR(50),
    endereco JSONB,
    contato JSONB,
    empresa_emissora BOOLEAN DEFAULT false,
    observacoes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE PRODUTOS (ACABADOS E MATÉRIAS PRIMAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('produto_acabado', 'materia_prima')),
    referencia_comercial VARCHAR(255),
    descricao TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE CARACTERÍSTICAS FÍSICO-QUÍMICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS caracteristicas_fisico_quimicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(255) NOT NULL,
    procedimento_analise TEXT NOT NULL,
    equipamentos_necessarios TEXT[] DEFAULT '{}',
    normas_tecnicas TEXT[] DEFAULT '{}',
    documentos JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE RELACIONAMENTO PRODUTO-CARACTERÍSTICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS produto_caracteristicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    caracteristica_id UUID REFERENCES caracteristicas_fisico_quimicas(id) ON DELETE CASCADE,
    valor_minimo DECIMAL(10,4),
    valor_maximo DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(produto_id, caracteristica_id)
);

-- =====================================================
-- TABELA DE ORDENS DE PRODUÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS ordens_producao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    produto_id UUID REFERENCES produtos(id),
    tipo_embalagem VARCHAR(100) NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    prazo DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'finalizada', 'cancelada')),
    observacoes TEXT,
    inicio_producao TIMESTAMP WITH TIME ZONE,
    fim_producao TIMESTAMP WITH TIME ZONE,
    lote_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE LOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    produto_id UUID REFERENCES produtos(id),
    quantidade_produzida DECIMAL(10,2),
    tipo_embalagem VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'aprovado', 'reprovado', 'aprovado_com_ressalvas')),
    ordem_producao_id UUID REFERENCES ordens_producao(id),
    observacoes_qualidade TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE ANÁLISES DE LOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS analises_lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
    caracteristica_id UUID REFERENCES caracteristicas_fisico_quimicas(id),
    valor DECIMAL(10,4) NOT NULL,
    status_parametro VARCHAR(50) NOT NULL DEFAULT 'aprovado' CHECK (status_parametro IN ('aprovado', 'reprovado')),
    observacoes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ANÁLISES GRANULOMÉTRICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS analises_granulometricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
    pesagens JSONB NOT NULL,
    tamanho_efetivo DECIMAL(10,4),
    coeficiente_uniformidade DECIMAL(10,4),
    quantidade_produzida_turno DECIMAL(10,2),
    quantidade_finos DECIMAL(10,2),
    porcentagem_finos DECIMAL(5,2),
    observacoes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ORDENS DE COLETA
-- =====================================================
CREATE TABLE IF NOT EXISTS ordens_coleta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_emissora_id UUID REFERENCES entidades(id),
    produto_id UUID REFERENCES produtos(id),
    quantidade DECIMAL(10,2) NOT NULL,
    tipo_embalagem VARCHAR(100) NOT NULL,
    transportadora_id UUID REFERENCES entidades(id),
    status VARCHAR(50) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_separacao', 'pronto_coleta', 'aguardando_nf', 'finalizada')),
    observacoes TEXT,
    prazo_entrega DATE,
    inicio_separacao TIMESTAMP WITH TIME ZONE,
    fim_separacao TIMESTAMP WITH TIME ZONE,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE EQUIPAMENTOS (MANUFATURA)
-- =====================================================
CREATE TABLE IF NOT EXISTS equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(100),
    localizacao VARCHAR(255),
    data_ultima_manutencao DATE,
    proxima_manutencao DATE,
    observacoes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE EQUIPAMENTOS DE CALIBRAÇÃO (QUALIDADE)
-- =====================================================
CREATE TABLE IF NOT EXISTS equipamentos_calibracao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(100),
    data_ultima_calibracao DATE,
    proxima_calibracao DATE,
    certificado_calibracao VARCHAR(255),
    observacoes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TABELA DE NORMAS TÉCNICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS normas_tecnicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referencia VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    versao VARCHAR(20),
    data_publicacao DATE,
    documento JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Índices para entidades
CREATE INDEX IF NOT EXISTS idx_entidades_cnpj ON entidades(cnpj);
CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON entidades(tipo);
CREATE INDEX IF NOT EXISTS idx_entidades_empresa_emissora ON entidades(empresa_emissora);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tipo);

-- Índices para ordens de produção
CREATE INDEX IF NOT EXISTS idx_ordens_producao_codigo ON ordens_producao(codigo);
CREATE INDEX IF NOT EXISTS idx_ordens_producao_status ON ordens_producao(status);
CREATE INDEX IF NOT EXISTS idx_ordens_producao_produto_id ON ordens_producao(produto_id);

-- Índices para lotes
CREATE INDEX IF NOT EXISTS idx_lotes_codigo ON lotes(codigo);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON lotes(status);
CREATE INDEX IF NOT EXISTS idx_lotes_produto_id ON lotes(produto_id);

-- Índices para ordens de coleta
CREATE INDEX IF NOT EXISTS idx_ordens_coleta_status ON ordens_coleta(status);
CREATE INDEX IF NOT EXISTS idx_ordens_coleta_empresa_emissora_id ON ordens_coleta(empresa_emissora_id);

-- Índices para análises
CREATE INDEX IF NOT EXISTS idx_analises_lotes_lote_id ON analises_lotes(lote_id);
CREATE INDEX IF NOT EXISTS idx_analises_lotes_caracteristica_id ON analises_lotes(caracteristica_id);
CREATE INDEX IF NOT EXISTS idx_analises_granulometricas_lote_id ON analises_granulometricas(lote_id);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entidades_updated_at BEFORE UPDATE ON entidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caracteristicas_fisico_quimicas_updated_at BEFORE UPDATE ON caracteristicas_fisico_quimicas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_producao_updated_at BEFORE UPDATE ON ordens_producao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON lotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_coleta_updated_at BEFORE UPDATE ON ordens_coleta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON equipamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipamentos_calibracao_updated_at BEFORE UPDATE ON equipamentos_calibracao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_normas_tecnicas_updated_at BEFORE UPDATE ON normas_tecnicas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir usuário master padrão (senha: admin123)
INSERT INTO users (name, email, password, role, sector, permissions, active) VALUES 
('Administrador Master', 'admin@tratae.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2.', 'master', 'comercial', ARRAY['all'], true)
ON CONFLICT (email) DO NOTHING;

-- Inserir algumas características físico-químicas padrão
INSERT INTO caracteristicas_fisico_quimicas (descricao, procedimento_analise, equipamentos_necessarios) VALUES 
('Umidade', 'Secagem em estufa a 105°C até peso constante', ARRAY['Estufa', 'Balança analítica']),
('Teor de Finos', 'Peneiramento em peneira 0.075mm', ARRAY['Peneiras', 'Balança analítica']),
('Densidade Aparente', 'Método do frasco volumétrico', ARRAY['Frasco volumétrico', 'Balança analítica']),
('Resistência à Compressão', 'Ensaio de compressão uniaxial', ARRAY['Prensa hidráulica', 'Extensômetro'])
ON CONFLICT DO NOTHING;

-- Inserir algumas normas técnicas padrão
INSERT INTO normas_tecnicas (referencia, descricao, versao) VALUES 
('NBR 7211', 'Agregado para concreto - Especificação', '2019'),
('NBR 7214', 'Areia normal para ensaio de cimento - Especificação', '2015'),
('NBR 7215', 'Cimento Portland - Determinação da resistência à compressão', '2019'),
('NBR 7216', 'Moldagem e cura de corpos de prova cilíndricos ou prismáticos de concreto', '2011')
ON CONFLICT DO NOTHING;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caracteristicas_fisico_quimicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_granulometricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_coleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_calibracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE normas_tecnicas ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (serão configuradas via aplicação)
-- Por enquanto, permitir acesso total para desenvolvimento
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON entidades FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON produtos FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON caracteristicas_fisico_quimicas FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON produto_caracteristicas FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON ordens_producao FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON lotes FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON analises_lotes FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON analises_granulometricas FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON ordens_coleta FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON equipamentos FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON equipamentos_calibracao FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON normas_tecnicas FOR ALL USING (true);
