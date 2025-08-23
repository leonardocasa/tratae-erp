const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { createValidationError, createNotFoundError, requireSector } = require('../middleware/auth');

const router = express.Router();

// Validações
const produtoValidation = [
  body('codigo').notEmpty().withMessage('Código é obrigatório'),
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('tipo').isIn(['produto_acabado', 'materia_prima']).withMessage('Tipo inválido')
];

const caracteristicaValidation = [
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('procedimento_analise').notEmpty().withMessage('Procedimento de análise é obrigatório'),
  body('equipamentos_necessarios').isArray().withMessage('Equipamentos deve ser um array')
];

const analiseLoteValidation = [
  body('lote_id').notEmpty().withMessage('Lote é obrigatório'),
  body('caracteristica_id').notEmpty().withMessage('Característica é obrigatória'),
  body('valor').notEmpty().withMessage('Valor é obrigatório'),
  body('observacoes').optional().isString()
];

// ===== PRODUTOS ACABADOS E MATÉRIAS PRIMAS =====

// Listar produtos
router.get('/produtos', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { tipo } = req.query;
    
    let query = supabase
      .from('produtos')
      .select('*')
      .order('nome');

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data: produtos, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      produtos: produtos || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar produto por ID
router.get('/produtos/:id', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: produto, error } = await supabase
      .from('produtos')
      .select(`
        *,
        caracteristicas:produto_caracteristicas(
          caracteristica_id,
          valor_minimo,
          valor_maximo,
          caracteristica:caracteristicas_fisico_quimicas(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !produto) {
      throw createNotFoundError('Produto');
    }

    res.json({ produto });

  } catch (error) {
    next(error);
  }
});

// Criar produto
router.post('/produtos', produtoValidation, requireSector('qualidade'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      codigo,
      nome,
      tipo,
      referencia_comercial,
      descricao,
      caracteristicas
    } = req.body;

    // Verificar se código já existe
    const { data: existingProduto } = await supabase
      .from('produtos')
      .select('id')
      .eq('codigo', codigo)
      .single();

    if (existingProduto) {
      return res.status(409).json({
        error: 'Código já cadastrado',
        code: 'CODIGO_ALREADY_EXISTS'
      });
    }

    const { data: novoProduto, error } = await supabase
      .from('produtos')
      .insert({
        codigo,
        nome,
        tipo,
        referencia_comercial,
        descricao,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Adicionar características se fornecidas
    if (caracteristicas && caracteristicas.length > 0) {
      const caracteristicasData = caracteristicas.map(car => ({
        produto_id: novoProduto.id,
        caracteristica_id: car.caracteristica_id,
        valor_minimo: car.valor_minimo,
        valor_maximo: car.valor_maximo
      }));

      await supabase
        .from('produto_caracteristicas')
        .insert(caracteristicasData);
    }

    res.status(201).json({
      message: 'Produto criado com sucesso',
      produto: novoProduto
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar produto
router.put('/produtos/:id', produtoValidation, requireSector('qualidade'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const updateData = req.body;
    updateData.updated_at = new Date().toISOString();
    updateData.updated_by = req.user.id;

    const { data: produtoAtualizado, error } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !produtoAtualizado) {
      throw createNotFoundError('Produto');
    }

    res.json({
      message: 'Produto atualizado com sucesso',
      produto: produtoAtualizado
    });

  } catch (error) {
    next(error);
  }
});

// ===== CARACTERÍSTICAS FÍSICO-QUÍMICAS =====

// Listar características
router.get('/caracteristicas', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { data: caracteristicas, error } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .select('*')
      .order('descricao');

    if (error) {
      throw error;
    }

    res.json({
      caracteristicas: caracteristicas || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar característica por ID
router.get('/caracteristicas/:id', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: caracteristica, error } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !caracteristica) {
      throw createNotFoundError('Característica');
    }

    res.json({ caracteristica });

  } catch (error) {
    next(error);
  }
});

// Criar característica
router.post('/caracteristicas', caracteristicaValidation, requireSector('qualidade'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      descricao,
      procedimento_analise,
      equipamentos_necessarios,
      normas_tecnicas,
      documentos
    } = req.body;

    const { data: novaCaracteristica, error } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .insert({
        descricao,
        procedimento_analise,
        equipamentos_necessarios,
        normas_tecnicas,
        documentos,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Característica criada com sucesso',
      caracteristica: novaCaracteristica
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar característica
router.put('/caracteristicas/:id', caracteristicaValidation, requireSector('qualidade'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const updateData = req.body;
    updateData.updated_at = new Date().toISOString();
    updateData.updated_by = req.user.id;

    const { data: caracteristicaAtualizada, error } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !caracteristicaAtualizada) {
      throw createNotFoundError('Característica');
    }

    res.json({
      message: 'Característica atualizada com sucesso',
      caracteristica: caracteristicaAtualizada
    });

  } catch (error) {
    next(error);
  }
});

// ===== ANÁLISE DE LOTES =====

// Listar lotes
router.get('/lotes', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { status, produto_id } = req.query;
    
    let query = supabase
      .from('lotes')
      .select(`
        *,
        produto:produtos(id, nome, codigo, tipo),
        ordem_producao:ordens_producao(id, codigo)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (produto_id) {
      query = query.eq('produto_id', produto_id);
    }

    const { data: lotes, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      lotes: lotes || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar lote por ID
router.get('/lotes/:id', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: lote, error } = await supabase
      .from('lotes')
      .select(`
        *,
        produto:produtos(*),
        ordem_producao:ordens_producao(*),
        analises:analises_lotes(
          *,
          caracteristica:caracteristicas_fisico_quimicas(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !lote) {
      throw createNotFoundError('Lote');
    }

    res.json({ lote });

  } catch (error) {
    next(error);
  }
});

// Criar análise de lote
router.post('/lotes/:id/analises', analiseLoteValidation, requireSector('qualidade'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { id: lote_id } = req.params;
    const {
      caracteristica_id,
      valor,
      observacoes
    } = req.body;

    // Verificar se o lote existe
    const { data: lote } = await supabase
      .from('lotes')
      .select('id, status, produto_id')
      .eq('id', lote_id)
      .single();

    if (!lote) {
      return res.status(404).json({
        error: 'Lote não encontrado',
        code: 'LOTE_NOT_FOUND'
      });
    }

    // Verificar se a característica existe
    const { data: caracteristica } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .select('id, descricao')
      .eq('id', caracteristica_id)
      .single();

    if (!caracteristica) {
      return res.status(404).json({
        error: 'Característica não encontrada',
        code: 'CARACTERISTICA_NOT_FOUND'
      });
    }

    // Buscar limites da característica para o produto
    const { data: limites } = await supabase
      .from('produto_caracteristicas')
      .select('valor_minimo, valor_maximo')
      .eq('produto_id', lote.produto_id)
      .eq('caracteristica_id', caracteristica_id)
      .single();

    // Verificar se está dentro dos limites
    let status_parametro = 'aprovado';
    if (limites) {
      const valorNumerico = parseFloat(valor);
      if (limites.valor_minimo && valorNumerico < limites.valor_minimo) {
        status_parametro = 'reprovado';
      } else if (limites.valor_maximo && valorNumerico > limites.valor_maximo) {
        status_parametro = 'reprovado';
      }
    }

    const { data: novaAnalise, error } = await supabase
      .from('analises_lotes')
      .insert({
        lote_id,
        caracteristica_id,
        valor,
        status_parametro,
        observacoes,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        caracteristica:caracteristicas_fisico_quimicas(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Atualizar status do lote baseado nas análises
    await atualizarStatusLote(lote_id);

    res.status(201).json({
      message: 'Análise criada com sucesso',
      analise: novaAnalise
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar status do lote manualmente
router.patch('/lotes/:id/status', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    const statusValidos = ['em_analise', 'aprovado', 'reprovado', 'aprovado_com_ressalvas'];
    
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        code: 'INVALID_STATUS'
      });
    }

    const updateData = {
      status,
      observacoes_qualidade: observacoes,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    const { data: loteAtualizado, error } = await supabase
      .from('lotes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        produto:produtos(id, nome, codigo)
      `)
      .single();

    if (error || !loteAtualizado) {
      throw createNotFoundError('Lote');
    }

    res.json({
      message: `Status do lote atualizado para: ${status}`,
      lote: loteAtualizado
    });

  } catch (error) {
    next(error);
  }
});

// Função para atualizar status do lote baseado nas análises
async function atualizarStatusLote(lote_id) {
  try {
    // Buscar todas as análises do lote
    const { data: analises } = await supabase
      .from('analises_lotes')
      .select('status_parametro')
      .eq('lote_id', lote_id);

    if (!analises || analises.length === 0) {
      return;
    }

    // Verificar se há alguma análise reprovada
    const temReprovada = analises.some(a => a.status_parametro === 'reprovado');
    const todasAprovadas = analises.every(a => a.status_parametro === 'aprovado');

    let novoStatus = 'em_analise';
    if (temReprovada) {
      novoStatus = 'reprovado';
    } else if (todasAprovadas) {
      novoStatus = 'aprovado';
    }

    // Atualizar status do lote
    await supabase
      .from('lotes')
      .update({ 
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', lote_id);

  } catch (error) {
    console.error('Erro ao atualizar status do lote:', error);
  }
}

// ===== EQUIPAMENTOS DE CALIBRAÇÃO =====

// Listar equipamentos de calibração
router.get('/equipamentos-calibracao', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { data: equipamentos, error } = await supabase
      .from('equipamentos_calibracao')
      .select('*')
      .order('nome');

    if (error) {
      throw error;
    }

    res.json({
      equipamentos: equipamentos || []
    });

  } catch (error) {
    next(error);
  }
});

// Criar equipamento de calibração
router.post('/equipamentos-calibracao', requireSector('qualidade'), async (req, res, next) => {
  try {
    const {
      nome,
      codigo,
      tipo,
      data_ultima_calibracao,
      proxima_calibracao,
      certificado_calibracao,
      observacoes
    } = req.body;

    const { data: novoEquipamento, error } = await supabase
      .from('equipamentos_calibracao')
      .insert({
        nome,
        codigo,
        tipo,
        data_ultima_calibracao,
        proxima_calibracao,
        certificado_calibracao,
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
      message: 'Equipamento de calibração criado com sucesso',
      equipamento: novoEquipamento
    });

  } catch (error) {
    next(error);
  }
});

// ===== NORMAS TÉCNICAS =====

// Listar normas técnicas
router.get('/normas-tecnicas', requireSector('qualidade'), async (req, res, next) => {
  try {
    const { data: normas, error } = await supabase
      .from('normas_tecnicas')
      .select('*')
      .order('referencia');

    if (error) {
      throw error;
    }

    res.json({
      normas: normas || []
    });

  } catch (error) {
    next(error);
  }
});

// Criar norma técnica
router.post('/normas-tecnicas', requireSector('qualidade'), async (req, res, next) => {
  try {
    const {
      referencia,
      descricao,
      versao,
      data_publicacao,
      documento
    } = req.body;

    const { data: novaNorma, error } = await supabase
      .from('normas_tecnicas')
      .insert({
        referencia,
        descricao,
        versao,
        data_publicacao,
        documento,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Norma técnica criada com sucesso',
      norma: novaNorma
    });

  } catch (error) {
    next(error);
  }
});

// Estatísticas do módulo qualidade
router.get('/stats', requireSector('qualidade'), async (req, res, next) => {
  try {
    // Contar produtos por tipo
    const { data: produtos } = await supabase
      .from('produtos')
      .select('tipo');

    // Contar lotes por status
    const { data: lotes } = await supabase
      .from('lotes')
      .select('status');

    // Contar características
    const { data: caracteristicas } = await supabase
      .from('caracteristicas_fisico_quimicas')
      .select('id');

    // Contar equipamentos vencendo calibração
    const { data: equipamentos } = await supabase
      .from('equipamentos_calibracao')
      .select('proxima_calibracao');

    const hoje = new Date();
    const equipamentosVencendo = equipamentos?.filter(e => {
      if (!e.proxima_calibracao) return false;
      const dataVencimento = new Date(e.proxima_calibracao);
      const diffDias = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
      return diffDias <= 30 && diffDias >= 0;
    }).length || 0;

    const stats = {
      produtos: {
        total: produtos?.length || 0,
        produtos_acabados: produtos?.filter(p => p.tipo === 'produto_acabado').length || 0,
        materias_primas: produtos?.filter(p => p.tipo === 'materia_prima').length || 0
      },
      lotes: {
        total: lotes?.length || 0,
        em_analise: lotes?.filter(l => l.status === 'em_analise').length || 0,
        aprovado: lotes?.filter(l => l.status === 'aprovado').length || 0,
        reprovado: lotes?.filter(l => l.status === 'reprovado').length || 0,
        aprovado_com_ressalvas: lotes?.filter(l => l.status === 'aprovado_com_ressalvas').length || 0
      },
      caracteristicas: {
        total: caracteristicas?.length || 0
      },
      equipamentos_calibracao: {
        total: equipamentos?.length || 0,
        vencendo_calibracao: equipamentosVencendo
      }
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
