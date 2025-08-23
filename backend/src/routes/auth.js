const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { AppError, createValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validações
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
];

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role').isIn(['master', 'comercial', 'manufatura', 'qualidade']).withMessage('Role inválida'),
  body('sector').isIn(['comercial', 'manufatura', 'qualidade']).withMessage('Setor inválido')
];

// Login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { email, password } = req.body;

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.active) {
      return res.status(401).json({
        error: 'Usuário inativo',
        code: 'USER_INACTIVE'
      });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        permissions: user.permissions
      }
    });

  } catch (error) {
    next(error);
  }
});

// Registro (apenas para usuário master)
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { name, email, password, role, sector, permissions = [] } = req.body;

    // Verificar se o email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'Email já cadastrado',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        sector,
        permissions,
        active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Erro ao criar usuário', 500, 'USER_CREATION_ERROR');
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        sector: newUser.sector,
        permissions: newUser.permissions
      }
    });

  } catch (error) {
    next(error);
  }
});

// Verificar token
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token não fornecido',
        code: 'TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário atualizado
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

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        permissions: user.permissions
      }
    });

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

    next(error);
  }
});

// Alterar senha
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Senha atual incorreta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Criptografar nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha
    await supabase
      .from('users')
      .update({ 
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    res.json({
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

// Logout (opcional - para invalidar tokens no frontend)
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logout realizado com sucesso'
  });
});

module.exports = router;
