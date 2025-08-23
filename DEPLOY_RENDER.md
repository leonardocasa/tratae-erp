# Deploy TRATAE ERP no Render

## 📋 Pré-requisitos

1. **Conta no Render**: [render.com](https://render.com)
2. **Repositório GitHub**: Código deve estar no GitHub
3. **Supabase**: Banco de dados já configurado

## 🚀 Deploy Automático

### 1. Conectar Repositório

1. Acesse [render.com](https://render.com)
2. Clique em "New" → "Blueprint"
3. Conecte seu repositório GitHub
4. Render detectará automaticamente o `render.yaml`

### 2. Configurar Variáveis de Ambiente

#### Backend (tratae-backend)
```
NODE_ENV=production
PORT=10000
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=seu_jwt_secret_super_seguro
RECEITA_WS_API_KEY=sua_chave_receita_ws
CORS_ORIGIN=https://tratae-frontend.onrender.com
```

#### Frontend (tratae-frontend)
```
REACT_APP_API_URL=https://tratae-backend.onrender.com
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. URLs dos Serviços

Após o deploy, você terá:
- **Frontend**: `https://tratae-frontend.onrender.com`
- **Backend**: `https://tratae-backend.onrender.com`
- **Health Check**: `https://tratae-backend.onrender.com/health`
- **API Docs**: `https://tratae-backend.onrender.com/api/docs`

## 🔧 Deploy Manual

### Backend

1. **Criar Web Service**
   - Name: `tratae-backend`
   - Environment: `Node`
   - Build Command: `cd backend && yarn install`
   - Start Command: `cd backend && yarn start`
   - Plan: `Free`

2. **Variáveis de Ambiente**
   - Adicione todas as variáveis listadas acima

### Frontend

1. **Criar Static Site**
   - Name: `tratae-frontend`
   - Build Command: `cd frontend && yarn install && yarn build`
   - Publish Directory: `frontend/build`
   - Plan: `Free`

2. **Variáveis de Ambiente**
   - Adicione as variáveis do frontend

## 📊 Monitoramento

### Logs
- Acesse o dashboard do Render
- Clique no serviço
- Vá para a aba "Logs"

### Health Check
```bash
curl https://tratae-backend.onrender.com/health
```

### API Documentation
```bash
curl https://tratae-backend.onrender.com/api/docs
```

## 🔒 Segurança

### CORS
- Configurado para aceitar apenas o domínio do frontend
- Credenciais habilitadas

### Rate Limiting
- 100 requisições por IP a cada 15 minutos
- Aplicado apenas nas rotas `/api/`

### Helmet
- Headers de segurança configurados
- CSP configurado para permitir Material-UI

## 🐛 Troubleshooting

### Problemas Comuns

1. **Build Failed**
   - Verifique os logs do build
   - Confirme se todas as dependências estão no `package.json`

2. **CORS Errors**
   - Verifique se `CORS_ORIGIN` está correto
   - Confirme se o frontend está acessando a URL correta

3. **Database Connection**
   - Verifique as variáveis do Supabase
   - Confirme se o banco está acessível

4. **Sleep Mode (Free Plan)**
   - Primeira requisição pode demorar 15-30 segundos
   - Serviços dormem após 15 minutos inativo

### Logs Úteis

```bash
# Backend logs
curl https://tratae-backend.onrender.com/health

# Frontend build
# Verificar se o build está gerando arquivos em frontend/build/
```

## 📈 Próximos Passos

1. **Custom Domain**
   - Configure um domínio personalizado
   - SSL automático incluído

2. **Monitoring**
   - Configure alertas
   - Monitore performance

3. **Scaling**
   - Upgrade para planos pagos se necessário
   - Configure auto-scaling

## 🔄 Atualizações

Para atualizar o sistema:
1. Faça push para o GitHub
2. Render fará deploy automático
3. Verifique os logs para confirmar sucesso

## 📞 Suporte

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Logs**: Dashboard do Render → Serviço → Logs
