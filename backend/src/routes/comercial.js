const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { createValidationError, createNotFoundError, requireSector } = require('../middleware/auth');

const router = express.Router();

// Validações
const entidadeValidation = [
  body('cnpj').notEmpty().withMessage('CNPJ é obrigatório'),
  body('razao_social').notEmpty().withMessage('Razão social é obrigatória'),
  body('tipo').isIn(['cliente', 'fornecedor', 'transportadora']).withMessage('Tipo inválido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('telefone').optional().notEmpty().withMessage('Telefone é obrigatório se fornecido')
];

const ordemColetaValidation = [
  body('empresa_emissora_id').notEmpty().withMessage('Empresa emissora é obrigatória'),
  body('produto_id').notEmpty().withMessage('Produto é obrigatório'),
  body('quantidade').isFloat({ min: 0.1 }).withMessage('Quantidade deve ser maior que zero'),
  body('tipo_embalagem').notEmpty().withMessage('Tipo de embalagem é obrigatório'),
  body('transportadora_id').optional().notEmpty().withMessage('Transportadora é obrigatória se fornecida')
];

// ===== ENTIDADES (CLIENTES, FORNECEDORES, TRANSPORTADORAS) =====

// Listar entidades
router.get('/entidades', requireSector('comercial'), async (req, res, next) => {
  try {
    const { tipo, empresa_emissora } = req.query;
    
    let query = supabase
      .from('entidades')
      .select('*')
      .order('razao_social');

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (empresa_emissora !== undefined) {
      query = query.eq('empresa_emissora', empresa_emissora === 'true');
    }

    const { data: entidades, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      entidades: entidades || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar entidade por ID
router.get('/entidades/:id', requireSector('comercial'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: entidade, error } = await supabase
      .from('entidades')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !entidade) {
      throw createNotFoundError('Entidade');
    }

    res.json({ entidade });

  } catch (error) {
    next(error);
  }
});

// Criar entidade
router.post('/entidades', entidadeValidation, requireSector('comercial'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      cnpj,
      razao_social,
      nome_fantasia,
      tipo,
      inscricao_estadual,
      inscricao_municipal,
      endereco,
      contato,
      empresa_emissora = false,
      observacoes
    } = req.body;

    // Verificar se CNPJ já existe
    const { data: existingEntidade } = await supabase
      .from('entidades')
      .select('id')
      .eq('cnpj', cnpj)
      .single();

    if (existingEntidade) {
      return res.status(409).json({
        error: 'CNPJ já cadastrado',
        code: 'CNPJ_ALREADY_EXISTS'
      });
    }

    const { data: novaEntidade, error } = await supabase
      .from('entidades')
      .insert({
        cnpj,
        razao_social,
        nome_fantasia,
        tipo,
        inscricao_estadual,
        inscricao_municipal,
        endereco,
        contato,
        empresa_emissora,
        observacoes,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Entidade criada com sucesso',
      entidade: novaEntidade
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar entidade
router.put('/entidades/:id', entidadeValidation, requireSector('comercial'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const updateData = req.body;
    updateData.updated_at = new Date().toISOString();
    updateData.updated_by = req.user.id;

    const { data: entidadeAtualizada, error } = await supabase
      .from('entidades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !entidadeAtualizada) {
      throw createNotFoundError('Entidade');
    }

    res.json({
      message: 'Entidade atualizada com sucesso',
      entidade: entidadeAtualizada
    });

  } catch (error) {
    next(error);
  }
});

// Deletar entidade
router.delete('/entidades/:id', requireSector('comercial'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se a entidade está sendo usada em ordens de coleta
    const { data: ordensExistentes } = await supabase
      .from('ordens_coleta')
      .select('id')
      .or(`empresa_emissora_id.eq.${id},transportadora_id.eq.${id}`)
      .limit(1);

    if (ordensExistentes && ordensExistentes.length > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar entidade que possui ordens de coleta associadas',
        code: 'ENTIDADE_IN_USE'
      });
    }

    const { error } = await supabase
      .from('entidades')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      message: 'Entidade deletada com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

// ===== ORDENS DE COLETA =====

// Listar ordens de coleta
router.get('/ordens-coleta', requireSector('comercial'), async (req, res, next) => {
  try {
    const { status, empresa_emissora_id } = req.query;
    
    let query = supabase
      .from('ordens_coleta')
      .select(`
        *,
        empresa_emissora:entidades!empresa_emissora_id(id, razao_social, nome_fantasia),
        transportadora:entidades!transportadora_id(id, razao_social, nome_fantasia),
        produto:produtos(id, nome, codigo)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (empresa_emissora_id) {
      query = query.eq('empresa_emissora_id', empresa_emissora_id);
    }

    const { data: ordens, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      ordens: ordens || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar ordem de coleta por ID
router.get('/ordens-coleta/:id', requireSector('comercial'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: ordem, error } = await supabase
      .from('ordens_coleta')
      .select(`
        *,
        empresa_emissora:entidades!empresa_emissora_id(*),
        transportadora:entidades!transportadora_id(*),
        produto:produtos(*)
      `)
      .eq('id', id)
      .single();

    if (error || !ordem) {
      throw createNotFoundError('Ordem de coleta');
    }

    res.json({ ordem });

  } catch (error) {
    next(error);
  }
});

// Criar ordem de coleta
router.post('/ordens-coleta', ordemColetaValidation, requireSector('comercial'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      empresa_emissora_id,
      produto_id,
      quantidade,
      tipo_embalagem,
      transportadora_id,
      observacoes,
      prazo_entrega
    } = req.body;

    // Verificar se a empresa emissora existe e é do tipo correto
    const { data: empresaEmissora } = await supabase
      .from('entidades')
      .select('id, tipo, empresa_emissora')
      .eq('id', empresa_emissora_id)
      .single();

    if (!empresaEmissora) {
      return res.status(404).json({
        error: 'Empresa emissora não encontrada',
        code: 'EMPRESA_EMISSORA_NOT_FOUND'
      });
    }

    if (!empresaEmissora.empresa_emissora) {
      return res.status(400).json({
        error: 'Empresa selecionada não é uma empresa emissora',
        code: 'NOT_EMPRESA_EMISSORA'
      });
    }

    // Verificar se o produto existe
    const { data: produto } = await supabase
      .from('produtos')
      .select('id')
      .eq('id', produto_id)
      .single();

    if (!produto) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        code: 'PRODUTO_NOT_FOUND'
      });
    }

    // Verificar transportadora se fornecida
    if (transportadora_id) {
      const { data: transportadora } = await supabase
        .from('entidades')
        .select('id, tipo')
        .eq('id', transportadora_id)
        .eq('tipo', 'transportadora')
        .single();

      if (!transportadora) {
        return res.status(404).json({
          error: 'Transportadora não encontrada',
          code: 'TRANSPORTADORA_NOT_FOUND'
        });
      }
    }

    const { data: novaOrdem, error } = await supabase
      .from('ordens_coleta')
      .insert({
        empresa_emissora_id,
        produto_id,
        quantidade,
        tipo_embalagem,
        transportadora_id,
        observacoes,
        prazo_entrega,
        status: 'aberta',
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        empresa_emissora:entidades!empresa_emissora_id(id, razao_social, nome_fantasia),
        transportadora:entidades!transportadora_id(id, razao_social, nome_fantasia),
        produto:produtos(id, nome, codigo)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Ordem de coleta criada com sucesso',
      ordem: novaOrdem
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar status da ordem de coleta
router.patch('/ordens-coleta/:id/status', requireSector('comercial'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    const statusValidos = ['aberta', 'em_separacao', 'pronto_coleta', 'aguardando_nf', 'finalizada'];
    
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        code: 'INVALID_STATUS'
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    if (observacoes) {
      updateData.observacoes = observacoes;
    }

    // Adicionar timestamps específicos baseados no status
    if (status === 'em_separacao') {
      updateData.inicio_separacao = new Date().toISOString();
    } else if (status === 'pronto_coleta') {
      updateData.fim_separacao = new Date().toISOString();
    } else if (status === 'finalizada') {
      updateData.data_finalizacao = new Date().toISOString();
    }

    const { data: ordemAtualizada, error } = await supabase
      .from('ordens_coleta')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        empresa_emissora:entidades!empresa_emissora_id(id, razao_social, nome_fantasia),
        transportadora:entidades!transportadora_id(id, razao_social, nome_fantasia),
        produto:produtos(id, nome, codigo)
      `)
      .single();

    if (error || !ordemAtualizada) {
      throw createNotFoundError('Ordem de coleta');
    }

    res.json({
      message: `Status da ordem atualizado para: ${status}`,
      ordem: ordemAtualizada
    });

  } catch (error) {
    next(error);
  }
});

// Deletar ordem de coleta
router.delete('/ordens-coleta/:id', requireSector('comercial'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se a ordem pode ser deletada (apenas se estiver aberta)
    const { data: ordem } = await supabase
      .from('ordens_coleta')
      .select('status')
      .eq('id', id)
      .single();

    if (!ordem) {
      throw createNotFoundError('Ordem de coleta');
    }

    if (ordem.status !== 'aberta') {
      return res.status(400).json({
        error: 'Apenas ordens com status "aberta" podem ser deletadas',
        code: 'ORDER_CANNOT_BE_DELETED'
      });
    }

    const { error } = await supabase
      .from('ordens_coleta')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      message: 'Ordem de coleta deletada com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

// Estatísticas do módulo comercial
router.get('/stats', requireSector('comercial'), async (req, res, next) => {
  try {
    // Contar entidades por tipo
    const { data: entidades } = await supabase
      .from('entidades')
      .select('tipo, empresa_emissora');

    // Contar ordens por status
    const { data: ordens } = await supabase
      .from('ordens_coleta')
      .select('status, created_at');

    const stats = {
      entidades: {
        total: entidades?.length || 0,
        clientes: entidades?.filter(e => e.tipo === 'cliente').length || 0,
        fornecedores: entidades?.filter(e => e.tipo === 'fornecedor').length || 0,
        transportadoras: entidades?.filter(e => e.tipo === 'transportadora').length || 0,
        empresas_emissoras: entidades?.filter(e => e.empresa_emissora).length || 0
      },
      ordens_coleta: {
        total: ordens?.length || 0,
        abertas: ordens?.filter(o => o.status === 'aberta').length || 0,
        em_separacao: ordens?.filter(o => o.status === 'em_separacao').length || 0,
        pronto_coleta: ordens?.filter(o => o.status === 'pronto_coleta').length || 0,
        aguardando_nf: ordens?.filter(o => o.status === 'aguardando_nf').length || 0,
        finalizadas: ordens?.filter(o => o.status === 'finalizada').length || 0
      }
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
