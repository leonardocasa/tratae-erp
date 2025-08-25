// Middleware para tratamento de erros
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id || 'não autenticado',
    timestamp: new Date().toISOString()
  });

  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // Erros de cast (IDs inválidos)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido',
      details: 'O formato do ID fornecido é inválido',
      code: 'INVALID_ID'
    });
  }

  // Erros de duplicação (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: 'Dados duplicados',
      details: `O campo ${field} já existe no sistema`,
      code: 'DUPLICATE_ENTRY',
      field
    });
  }

  // Erros do Supabase
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      error: 'Erro no banco de dados',
      details: err.message,
      code: 'DATABASE_ERROR'
    });
  }

  // Erros de API externa
  if (err.isAxiosError) {
    const status = err.response?.status || 500;
    return res.status(status).json({
      error: 'Erro na API externa',
      details: err.response?.data?.message || err.message,
      code: 'EXTERNAL_API_ERROR'
    });
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    details: err?.response?.data || err?.details || undefined,
    path: req.originalUrl,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Classe para erros customizados
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Função para criar erros de validação
const createValidationError = (message) => {
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

// Função para criar erros de não encontrado
const createNotFoundError = (resource) => {
  return new AppError(`${resource} não encontrado`, 404, 'NOT_FOUND');
};

// Função para criar erros de permissão
const createPermissionError = (action) => {
  return new AppError(`Sem permissão para ${action}`, 403, 'INSUFFICIENT_PERMISSIONS');
};

module.exports = {
  errorHandler,
  AppError,
  createValidationError,
  createNotFoundError,
  createPermissionError
};
