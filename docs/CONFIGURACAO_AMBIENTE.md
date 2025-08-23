# Configuração das Variáveis de Ambiente - TRATAE ERP

## 📋 Visão Geral

Este documento explica como configurar as variáveis de ambiente necessárias para executar o sistema TRATAE ERP.

## 🚀 Configuração Rápida

### 1. Supabase (Obrigatório)

#### Criar Projeto no Supabase:
1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: `tratae-erp`
   - **Database Password**: (escolha uma senha forte)
   - **Region**: (escolha a mais próxima)
5. Clique em "Create new project"

#### Obter Credenciais:
1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL** (SUPABASE_URL)
   - **anon public** (SUPABASE_ANON_KEY)
   - **service_role** (SUPABASE_SERVICE_ROLE_KEY)

#### Configurar no Backend:
Edite `backend/.env`:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

#### Configurar no Frontend:
Edite `frontend/.env`:
```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 2. ReceitaWS API (Obrigatório)

#### Obter Chave da API:
1. Acesse [https://receitaws.com.br](https://receitaws.com.br)
2. Faça login ou crie uma conta
3. Vá em **API** → **Minhas Chaves**
4. Gere uma nova chave de API

#### Configurar no Backend:
Edite `backend/.env`:
```env
RECEITA_WS_API_KEY=sua_chave_receita_ws_aqui
```

### 3. JWT Secret (Obrigatório)

#### Gerar Chave Segura:
Execute no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Configurar no Backend:
Edite `backend/.env`:
```env
JWT_SECRET=sua_chave_jwt_gerada_aqui
```

## 📁 Estrutura dos Arquivos .env

### Backend (.env)
```env
# Configurações do Servidor
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# JWT Configuration
JWT_SECRET=sua_chave_jwt
JWT_EXPIRES_IN=24h

# API Externa - ReceitaWS
RECEITA_WS_API_KEY=sua_chave_receita_ws
RECEITA_WS_BASE_URL=https://receitaws.com.br/v1

# Configurações de Segurança
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações de Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Configurações de Log
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Configurações de Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_email
```

### Frontend (.env)
```env
# Configurações do Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anon

# Configurações de Desenvolvimento
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true

# Configurações de Recursos
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_ALLOWED_FILE_TYPES=image/*,application/pdf,.doc,.docx,.xls,.xlsx

# Configurações de UI
REACT_APP_THEME=light
REACT_APP_LANGUAGE=pt-BR

# Configurações de Analytics (opcional)
REACT_APP_GOOGLE_ANALYTICS_ID=seu_ga_id

# Configurações de Recaptcha (opcional)
REACT_APP_RECAPTCHA_SITE_KEY=sua_chave_recaptcha
```

## 🔧 Configuração do Banco de Dados

Após configurar as variáveis do Supabase:

1. Execute a migração do banco:
```bash
yarn migrate
```

2. Verifique se as tabelas foram criadas no Supabase Dashboard

## 🚀 Executando o Projeto

1. Instale as dependências:
```bash
yarn install:all
```

2. Verifique o ambiente:
```bash
yarn check_environment
```

3. Execute o projeto:
```bash
yarn dev
```

## 🔒 Segurança

### Variáveis Sensíveis:
- **NUNCA** commite arquivos `.env` no Git
- Use `.env.example` como template
- Mantenha as chaves seguras
- Use diferentes chaves para desenvolvimento e produção

### JWT Secret:
- Use uma chave forte e única
- Mude regularmente em produção
- Não compartilhe entre ambientes

## 🐛 Troubleshooting

### Erro de Conexão com Supabase:
- Verifique se as credenciais estão corretas
- Confirme se o projeto está ativo
- Verifique se o IP não está bloqueado

### Erro de ReceitaWS:
- Verifique se a chave da API está correta
- Confirme se a conta tem créditos disponíveis
- Verifique se não excedeu o limite de requisições

### Erro de JWT:
- Gere uma nova chave JWT
- Verifique se a chave tem pelo menos 32 caracteres
- Confirme se não há caracteres especiais problemáticos

## 📞 Suporte

Para dúvidas sobre configuração:
1. Verifique este documento
2. Execute `yarn check_environment`
3. Consulte os logs do sistema
4. Entre em contato com a equipe de desenvolvimento
