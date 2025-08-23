const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' do início
    
    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.active) {
      return res.status(401).json({
        error: 'Usuário inativo',
        code: 'USER_INACTIVE'
      });
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sector: user.sector,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Erro interno na autenticação',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware para verificar permissões específicas
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Usuário master tem todas as permissões
    if (req.user.role === 'master') {
      return next();
    }

    // Verificar se o usuário tem a permissão específica
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Permissão insuficiente',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
};

// Middleware para verificar setor específico
const requireSector = (sector) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Usuário master tem acesso a todos os setores
    if (req.user.role === 'master') {
      return next();
    }

    // Verificar se o usuário pertence ao setor
    if (req.user.sector !== sector) {
      return res.status(403).json({
        error: 'Acesso negado ao setor',
        code: 'SECTOR_ACCESS_DENIED',
        required: sector,
        userSector: req.user.sector
      });
    }

    next();
  };
};

// Middleware para verificar se é usuário master
const requireMaster = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'master') {
    return res.status(403).json({
      error: 'Acesso restrito ao usuário master',
      code: 'MASTER_ACCESS_REQUIRED'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  requirePermission,
  requireSector,
  requireMaster
};
