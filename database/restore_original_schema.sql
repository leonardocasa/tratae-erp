-- SCRIPT DE RESTAURAÇÃO - VOLTAR AO SCHEMA ORIGINAL
-- Execute este script no SQL Editor do Supabase para restaurar o estado original

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entidades') THEN
        RAISE EXCEPTION 'Tabela entidades não existe!';
    END IF;
END $$;

-- 2. Remover campos adicionados pela API de consulta CNPJ/CPF
ALTER TABLE entidades DROP COLUMN IF EXISTS documento;
ALTER TABLE entidades DROP COLUMN IF EXISTS tipo_pessoa;
ALTER TABLE entidades DROP COLUMN IF EXISTS nome_completo;
ALTER TABLE entidades DROP COLUMN IF EXISTS rg;
ALTER TABLE entidades DROP COLUMN IF EXISTS data_nascimento;
ALTER TABLE entidades DROP COLUMN IF EXISTS sexo;
ALTER TABLE entidades DROP COLUMN IF EXISTS data_abertura;
ALTER TABLE entidades DROP COLUMN IF EXISTS capital_social;
ALTER TABLE entidades DROP COLUMN IF EXISTS natureza_juridica;
ALTER TABLE entidades DROP COLUMN IF EXISTS situacao;
ALTER TABLE entidades DROP COLUMN IF EXISTS tipo_empresa;
ALTER TABLE entidades DROP COLUMN IF EXISTS porte;
ALTER TABLE entidades DROP COLUMN IF EXISTS atividade_principal;
ALTER TABLE entidades DROP COLUMN IF EXISTS atividades_secundarias;
ALTER TABLE entidades DROP COLUMN IF EXISTS quadro_socios;
ALTER TABLE entidades DROP COLUMN IF EXISTS ultima_atualizacao;
ALTER TABLE entidades DROP COLUMN IF EXISTS fonte_consulta;

-- 3. Garantir que o campo CNPJ existe e é único
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14);
ALTER TABLE entidades ADD CONSTRAINT IF NOT EXISTS entidades_cnpj_key UNIQUE (cnpj);

-- 4. Restaurar constraint original do tipo
ALTER TABLE entidades DROP CONSTRAINT IF EXISTS entidades_tipo_check;
ALTER TABLE entidades ADD CONSTRAINT entidades_tipo_check 
CHECK (tipo IN ('cliente', 'fornecedor', 'transportadora', 'emissora'));

-- 5. Remover índices desnecessários
DROP INDEX IF EXISTS idx_entidades_tipo_pessoa;
DROP INDEX IF EXISTS idx_entidades_documento;

-- 6. Mostrar estrutura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'entidades' 
ORDER BY ordinal_position;

-- 7. Verificar constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'entidades'::regclass;
