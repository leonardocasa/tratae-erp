# TRATAE ERP - Sistema de Gestão Empresarial

Sistema ERP completo para a empresa TRATAE, com foco nos módulos de Comercial, Manufatura e Qualidade.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18 com TypeScript
- **Backend:** Node.js com Express
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **UI/UX:** Material-UI (MUI) com design responsivo
- **Gerenciamento de Estado:** Zustand
- **API Externa:** ReceitaWS para consulta de CNPJ

## 📋 Módulos do Sistema

### 🏢 Módulo Comercial
- Cadastro unificado de Clientes, Fornecedores e Transportadoras
- Integração com API de dados públicos (CNPJ)
- Sistema Kanban para Ordens de Coleta
- Gestão de empresas emissoras do grupo TRATAE

### 🏭 Módulo Manufatura
- Ordens de Produção com geração automática de lotes
- Acompanhamento de análise granulométrica
- Cadastro e manutenção de equipamentos
- Controle de produção por turnos

### 🔬 Módulo Qualidade
- Cadastro de Produtos Acabados e Matérias Primas
- Características físico-químicas com limites
- Análise de lotes com mapas de trabalho
- Controle de equipamentos e calibração

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- Yarn 1.22+
- Conta no Supabase

### Passos para Instalação

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd TRATAE
```

2. **Instale as dependências:**
```bash
yarn setup
```

3. **Configure as variáveis de ambiente:**
   - Copie `.env.example` para `.env` em ambas as pastas `frontend` e `backend`
   - Configure as credenciais do Supabase
   - Configure a chave da API ReceitaWS

4. **Execute o projeto:**
```bash
yarn dev
```

O sistema estará disponível em:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📁 Estrutura do Projeto

```
TRATAE/
├── frontend/                 # Aplicação React
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas do sistema
│   │   ├── modules/        # Módulos específicos
│   │   ├── services/       # Serviços e APIs
│   │   └── utils/          # Utilitários
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── controllers/    # Controladores
│   │   ├── routes/         # Rotas da API
│   │   ├── models/         # Modelos de dados
│   │   └── middleware/     # Middlewares
├── database/               # Scripts de banco de dados
└── docs/                   # Documentação
```

## 🔐 Controle de Acesso

O sistema possui um sistema de controle de acesso baseado em setores:
- **Usuário Master:** Acesso completo ao sistema
- **Comercial:** Acesso aos módulos comerciais
- **Manufatura:** Acesso aos módulos de produção
- **Qualidade:** Acesso aos módulos de qualidade

## 📊 Funcionalidades Principais

### Sistema Kanban (Ordens de Coleta)
- Abertas → Em Separação → Pronto para Coleta → Aguardando NF → Finalizadas

### Geração Automática de Lotes
- Formato: `160.25` (sequencial.ano)
- Integração automática com módulo de qualidade

### Análise Granulométrica
- Cálculo automático de tamanho efetivo e coeficiente de uniformidade
- Histórico das últimas 4 análises
- Cálculo de porcentagem de finos

## 🤝 Contribuição

Para contribuir com o projeto:
1. Crie uma branch para sua feature
2. Faça commit das suas mudanças
3. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou suporte técnico, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido para TRATAE** - Sistema ERP Completo
