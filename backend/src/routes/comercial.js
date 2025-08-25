const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin: supabase } = require('../config/supabase');
const { createValidationError, createNotFoundError, requireSector } = require('../middleware/auth');

const router = express.Router();

// Validações (nova estrutura)
const entidadeValidation = [
  body('documento_tipo').isIn(['CNPJ', 'CPF']).withMessage('documento_tipo deve ser CNPJ ou CPF'),
  body('cnpj').if(body('documento_tipo').equals('CNPJ')).isLength({ min: 11 }).withMessage('CNPJ obrigatório para documento_tipo=CNPJ'),
  body('cpf').if(body('documento_tipo').equals('CPF')).isLength({ min: 11 }).withMessage('CPF obrigatório para documento_tipo=CPF'),
  body('razao_social').notEmpty().withMessage('Razão social / nome é obrigatório'),
  body('tipos').isArray({ min: 1 }).withMessage('Informe ao menos um tipo'),
  body('email').optional().isEmail().withMessage('Email inválido'),
];

const ordemColetaValidation = [
  body('emissora_id').notEmpty().withMessage('Empresa emissora é obrigatória'),
  body('produto').notEmpty().withMessage('Produto é obrigatório'),
  body('quantidade').isFloat({ min: 0.0001 }).withMessage('Quantidade deve ser maior que zero'),
  body('unidade').optional().isString(),
  body('embalagem').optional().isString(),
  body('transportadora_id').optional().isString()
];

// ===== ENTIDADES (CLIENTES, FORNECEDORES, TRANSPORTADORAS, EMISSORAS) =====

// Listar entidades
router.get('/entidades', requireSector('comercial'), async (req, res, next) => {
  try {
    const { tipo, cnpj, cpf } = req.query;
    
    let query = supabase
      .from('entidades')
      .select('*')
      .order('razao_social');

    if (tipo) {
      // tipos é um array: entidades que contêm o tipo informado
      query = query.contains('tipos', [tipo]);
    }

    if (cnpj) {
      query = query.eq('cnpj', cnpj);
    }

    if (cpf) {
      query = query.eq('cpf', cpf);
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

// Criar entidade (nova estrutura)
router.post('/entidades', entidadeValidation, requireSector('comercial'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      documento_tipo,
      cnpj,
      cpf,
      razao_social,
      nome_fantasia,
      data_abertura,
      capital_social,
      email,
      fone,
      tipos = [],
      api_raw
    } = req.body;

    // Duplicidade de documento
    if (documento_tipo === 'CNPJ' && cnpj) {
      const { data: dup } = await supabase.from('entidades').select('id').eq('cnpj', cnpj).single();
      if (dup) return res.status(409).json({ error: 'CNPJ já cadastrado' });
    } else if (documento_tipo === 'CPF' && cpf) {
      const { data: dup } = await supabase.from('entidades').select('id').eq('cpf', cpf).single();
      if (dup) return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    const { data: novaEntidade, error } = await supabase
      .from('entidades')
      .insert({
        documento_tipo,
        cnpj: documento_tipo === 'CNPJ' ? cnpj : null,
        cpf: documento_tipo === 'CPF' ? cpf : null,
        razao_social,
        nome_fantasia,
        data_abertura: data_abertura || null,
        capital_social: capital_social || null,
        email: email || null,
        fone: fone || null,
        tipos,
        api_raw: api_raw || null,
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

// Atualizar entidade (parcial)
router.put('/entidades/:id', entidadeValidation, requireSector('comercial'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const updateData = {
      documento_tipo: req.body.documento_tipo,
      cnpj: req.body.documento_tipo === 'CNPJ' ? req.body.cnpj : null,
      cpf: req.body.documento_tipo === 'CPF' ? req.body.cpf : null,
      razao_social: req.body.razao_social,
      nome_fantasia: req.body.nome_fantasia,
      data_abertura: req.body.data_abertura || null,
      capital_social: req.body.capital_social || null,
      email: req.body.email || null,
      fone: req.body.fone || null,
      tipos: Array.isArray(req.body.tipos) ? req.body.tipos : [],
      api_raw: req.body.api_raw || null,
      updated_at: new Date().toISOString(),
    };

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

    // Não permitir deletar entidade vinculada em OC
    const { data: ordensExistentes } = await supabase
      .from('ordens_coleta')
      .select('id')
      .or(`emissora_id.eq.${id},transportadora_id.eq.${id},cliente_id.eq.${id}`)
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

    res.json({ message: 'Entidade deletada com sucesso' });

  } catch (error) {
    next(error);
  }
});

// ===== ORDENS DE COLETA =====

// Listar ordens de coleta
router.get('/ordens-coleta', requireSector('comercial'), async (req, res, next) => {
  try {
    const { status, emissora_id } = req.query;
    
    let query = supabase
      .from('ordens_coleta')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (emissora_id) {
      query = query.eq('emissora_id', emissora_id);
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
      .select('*')
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
      emissora_id,
      cliente_id,
      transportadora_id,
      produto,
      referencia,
      observacao,
      quantidade,
      unidade = 'ton',
      embalagem
    } = req.body;

    // Verificar empresa emissora
    const { data: empresaEmissora } = await supabase
      .from('entidades')
      .select('id, tipos')
      .eq('id', emissora_id)
      .single();

    if (!empresaEmissora) {
      return res.status(404).json({
        error: 'Empresa emissora não encontrada',
        code: 'EMPRESA_EMISSORA_NOT_FOUND'
      });
    }

    // Aceitar emissora se flag true ou tipo 'emissora'
    const podeEmitir = Array.isArray(empresaEmissora.tipos) && empresaEmissora.tipos.includes('emissora');
    if (!podeEmitir) {
      return res.status(400).json({
        error: 'Empresa selecionada não é uma empresa emissora',
        code: 'NOT_EMPRESA_EMISSORA'
      });
    }

    // Verificar transportadora se fornecida
    if (transportadora_id) {
      const { data: transportadora } = await supabase
        .from('entidades')
        .select('id, tipos')
        .eq('id', transportadora_id)
        .single();

      if (!transportadora || !transportadora.tipos?.includes('transportadora')) {
        return res.status(404).json({
          error: 'Transportadora não encontrada',
          code: 'TRANSPORTADORA_NOT_FOUND'
        });
      }
    }

    const { data: novaOrdem, error } = await supabase
      .from('ordens_coleta')
      .insert({
        emissora_id,
        cliente_id: cliente_id || null,
        transportadora_id: transportadora_id || null,
        produto,
        referencia: referencia || null,
        observacao: observacao || null,
        quantidade,
        unidade,
        embalagem: embalagem || null,
        status: 'rascunho',
        created_at: new Date().toISOString()
      })
      .select('*')
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
    const { status, observacao } = req.body;

    const statusValidos = ['rascunho','em_separacao','pronto','coleta_solicitada','coletado','cancelado'];
    
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        code: 'INVALID_STATUS'
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (observacao) {
      updateData.observacao = observacao;
    }

    const { data: ordemAtualizada, error } = await supabase
      .from('ordens_coleta')
      .update(updateData)
      .eq('id', id)
      .select('*')
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

    res.json({ message: 'Ordem de coleta deletada com sucesso' });

  } catch (error) {
    next(error);
  }
});

// Estatísticas do módulo comercial
router.get('/stats', requireSector('comercial'), async (req, res, next) => {
  try {
    const { data: entidades } = await supabase
      .from('entidades')
      .select('tipos');

    const { data: ordens } = await supabase
      .from('ordens_coleta')
      .select('status, created_at');

    const stats = {
      entidades: {
        total: entidades?.length || 0,
        clientes: entidades?.filter(e => e.tipos?.includes('cliente')).length || 0,
        fornecedores: entidades?.filter(e => e.tipos?.includes('fornecedor')).length || 0,
        transportadoras: entidades?.filter(e => e.tipos?.includes('transportadora')).length || 0,
        emissoras: entidades?.filter(e => e.tipos?.includes('emissora')).length || 0
      },
      ordens_coleta: {
        total: ordens?.length || 0,
        rascunho: ordens?.filter(o => o.status === 'rascunho').length || 0,
        em_separacao: ordens?.filter(o => o.status === 'em_separacao').length || 0,
        pronto: ordens?.filter(o => o.status === 'pronto').length || 0,
        coleta_solicitada: ordens?.filter(o => o.status === 'coleta_solicitada').length || 0,
        coletado: ordens?.filter(o => o.status === 'coletado').length || 0,
        cancelado: ordens?.filter(o => o.status === 'cancelado').length || 0
      }
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
