const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { createValidationError, createNotFoundError, requireMaster } = require('../middleware/auth');

const router = express.Router();

// Validações
const userValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('role').isIn(['master', 'comercial', 'manufatura', 'qualidade']).withMessage('Role inválida'),
  body('sector').isIn(['comercial', 'manufatura', 'qualidade']).withMessage('Setor inválido')
];

// Listar todos os usuários (apenas master)
router.get('/', requireMaster, async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, sector, permissions, active, created_at, last_login')
      .order('name');

    if (error) {
      throw error;
    }

    res.json({
      users: users || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar usuário por ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Usuário só pode ver seus próprios dados, exceto master
    if (req.user.role !== 'master' && userId !== id) {
      return res.status(403).json({
        error: 'Sem permissão para visualizar este usuário',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, sector, permissions, active, created_at, last_login')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw createNotFoundError('Usuário');
    }

    res.json({ user });

  } catch (error) {
    next(error);
  }
});

// Atualizar usuário
router.put('/:id', userValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const userId = req.user.id;
    const { name, email, role, sector, permissions, active } = req.body;

    // Verificar permissões
    if (req.user.role !== 'master' && userId !== id) {
      return res.status(403).json({
        error: 'Sem permissão para editar este usuário',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Verificar se email já existe (exceto para o próprio usuário)
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', id)
        .single();

      if (existingUser) {
        return res.status(409).json({
          error: 'Email já cadastrado',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role && req.user.role === 'master') updateData.role = role;
    if (sector) updateData.sector = sector;
    if (permissions && req.user.role === 'master') updateData.permissions = permissions;
    if (typeof active === 'boolean' && req.user.role === 'master') updateData.active = active;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, sector, permissions, active, created_at, last_login')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    next(error);
  }
});

// Desativar/Ativar usuário (apenas master)
router.patch('/:id/toggle-status', requireMaster, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar usuário atual
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('active')
      .eq('id', id)
      .single();

    if (fetchError || !currentUser) {
      throw createNotFoundError('Usuário');
    }

    // Alternar status
    const newStatus = !currentUser.active;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, email, active')
      .single();

    if (error) {
      throw error;
    }

    res.json({
      message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      user: updatedUser
    });

  } catch (error) {
    next(error);
  }
});

// Deletar usuário (apenas master)
router.delete('/:id', requireMaster, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se não está tentando deletar a si mesmo
    if (req.user.id === id) {
      return res.status(400).json({
        error: 'Não é possível deletar seu próprio usuário',
        code: 'SELF_DELETION_NOT_ALLOWED'
      });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      message: 'Usuário deletado com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

// Buscar usuários por setor
router.get('/sector/:sector', async (req, res, next) => {
  try {
    const { sector } = req.params;

    // Verificar se o usuário tem acesso ao setor
    if (req.user.role !== 'master' && req.user.sector !== sector) {
      return res.status(403).json({
        error: 'Sem permissão para acessar este setor',
        code: 'SECTOR_ACCESS_DENIED'
      });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, sector, active')
      .eq('sector', sector)
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    res.json({
      users: users || []
    });

  } catch (error) {
    next(error);
  }
});

// Estatísticas de usuários (apenas master)
router.get('/stats/overview', requireMaster, async (req, res, next) => {
  try {
    // Contar usuários por setor
    const { data: sectorStats, error: sectorError } = await supabase
      .from('users')
      .select('sector, active');

    if (sectorError) {
      throw sectorError;
    }

    const stats = {
      total: sectorStats.length,
      active: sectorStats.filter(u => u.active).length,
      inactive: sectorStats.filter(u => !u.active).length,
      bySector: {
        comercial: sectorStats.filter(u => u.sector === 'comercial' && u.active).length,
        manufatura: sectorStats.filter(u => u.sector === 'manufatura' && u.active).length,
        qualidade: sectorStats.filter(u => u.sector === 'qualidade' && u.active).length
      },
      byRole: {
        master: sectorStats.filter(u => u.role === 'master' && u.active).length,
        comercial: sectorStats.filter(u => u.role === 'comercial' && u.active).length,
        manufatura: sectorStats.filter(u => u.role === 'manufatura' && u.active).length,
        qualidade: sectorStats.filter(u => u.role === 'qualidade' && u.active).length
      }
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
