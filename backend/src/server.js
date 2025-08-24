const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Configuração de proxy para rate limiting
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
}));

// Compressão
app.use(compression());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'TRATAE ERP Backend API',
    status: 'Online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/api/docs',
      login: '/api/auth/login'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'TRATAE ERP API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        verify: 'GET /api/auth/verify',
        changePassword: 'POST /api/auth/change-password',
        logout: 'POST /api/auth/logout'
      },
      cnpj: {
        consultar: 'GET /api/cnpj/consultar/:cnpj',
        validar: 'GET /api/cnpj/validar/:cnpj',
        formatar: 'GET /api/cnpj/formatar/:cnpj'
      },
      comercial: {
        clientes: 'GET/POST/PUT/DELETE /api/comercial/clientes',
        fornecedores: 'GET/POST/PUT/DELETE /api/comercial/fornecedores',
        transportadores: 'GET/POST/PUT/DELETE /api/comercial/transportadores',
        ordensColeta: 'GET/POST/PUT/DELETE /api/comercial/ordens-coleta'
      },
      manufatura: {
        ordensProducao: 'GET/POST/PUT/DELETE /api/manufatura/ordens-producao',
        analisesGranulometricas: 'GET/POST/PUT/DELETE /api/manufatura/analises-granulometricas',
        equipamentos: 'GET/POST/PUT/DELETE /api/manufatura/equipamentos'
      },
      qualidade: {
        produtos: 'GET/POST/PUT/DELETE /api/qualidade/produtos',
        caracteristicas: 'GET/POST/PUT/DELETE /api/qualidade/caracteristicas',
        analisesLotes: 'GET/POST/PUT/DELETE /api/qualidade/analises-lotes',
        equipamentosCalibracao: 'GET/POST/PUT/DELETE /api/qualidade/equipamentos-calibracao',
        normasTecnicas: 'GET/POST/PUT/DELETE /api/qualidade/normas-tecnicas'
      },
      users: {
        list: 'GET /api/users',
        getById: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
        bySector: 'GET /api/users/setor/:setor',
        stats: 'GET /api/users/stats'
      }
    }
  });
});

// Rotas públicas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cnpj', require('./routes/cnpj'));

// Middleware de autenticação
const { authMiddleware } = require('./middleware/auth');

// Rotas protegidas
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/comercial', authMiddleware, require('./routes/comercial'));
app.use('/api/manufatura', authMiddleware, require('./routes/manufatura'));
app.use('/api/qualidade', authMiddleware, require('./routes/qualidade'));

// Middleware de tratamento de erros
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor TRATAE ERP rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});
