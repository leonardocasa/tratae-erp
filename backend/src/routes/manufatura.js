const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { createValidationError, createNotFoundError, requireSector } = require('../middleware/auth');

const router = express.Router();

// Validações
const ordemProducaoValidation = [
  body('produto_id').notEmpty().withMessage('Produto é obrigatório'),
  body('tipo_embalagem').notEmpty().withMessage('Tipo de embalagem é obrigatório'),
  body('quantidade').isFloat({ min: 0.1 }).withMessage('Quantidade deve ser maior que zero'),
  body('prazo').isISO8601().withMessage('Prazo deve ser uma data válida')
];

const analiseGranulometricaValidation = [
  body('lote_id').notEmpty().withMessage('Lote é obrigatório'),
  body('pesagens').isArray().withMessage('Pesagens deve ser um array'),
  body('pesagens.*.peneira').notEmpty().withMessage('Peneira é obrigatória'),
  body('pesagens.*.peso').isFloat({ min: 0 }).withMessage('Peso deve ser maior ou igual a zero')
];

// ===== ORDENS DE PRODUÇÃO =====

// Listar ordens de produção
router.get('/ordens-producao', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { status, produto_id } = req.query;
    
    let query = supabase
      .from('ordens_producao')
      .select(`
        *,
        produto:produtos(id, nome, codigo),
        lote:lotes(id, codigo, status)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (produto_id) {
      query = query.eq('produto_id', produto_id);
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

// Buscar ordem de produção por ID
router.get('/ordens-producao/:id', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: ordem, error } = await supabase
      .from('ordens_producao')
      .select(`
        *,
        produto:produtos(*),
        lote:lotes(*)
      `)
      .eq('id', id)
      .single();

    if (error || !ordem) {
      throw createNotFoundError('Ordem de produção');
    }

    res.json({ ordem });

  } catch (error) {
    next(error);
  }
});

// Criar ordem de produção
router.post('/ordens-producao', ordemProducaoValidation, requireSector('manufatura'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      produto_id,
      tipo_embalagem,
      quantidade,
      prazo,
      observacoes
    } = req.body;

    // Verificar se o produto existe
    const { data: produto } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('id', produto_id)
      .single();

    if (!produto) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        code: 'PRODUTO_NOT_FOUND'
      });
    }

    const { data: novaOrdem, error } = await supabase
      .from('ordens_producao')
      .insert({
        produto_id,
        tipo_embalagem,
        quantidade,
        prazo,
        observacoes,
        status: 'pendente',
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        produto:produtos(id, nome, codigo)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Ordem de produção criada com sucesso',
      ordem: novaOrdem
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar status da ordem de produção
router.patch('/ordens-producao/:id/status', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    const statusValidos = ['pendente', 'em_producao', 'finalizada', 'cancelada'];
    
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

    // Se mudando para "em_producao", gerar lote
    if (status === 'em_producao') {
      updateData.inicio_producao = new Date().toISOString();
      
      // Gerar código do lote
      const { data: ultimoLote } = await supabase
        .from('lotes')
        .select('codigo')
        .order('created_at', { ascending: false })
        .limit(1);

      let proximoNumero = 1;
      if (ultimoLote && ultimoLote.length > 0) {
        const ultimoCodigo = ultimoLote[0].codigo;
        const partes = ultimoCodigo.split('.');
        if (partes.length === 2) {
          proximoNumero = parseInt(partes[0]) + 1;
        }
      }

      const ano = new Date().getFullYear().toString().slice(-2);
      const codigoLote = `${proximoNumero}.${ano}`;

      // Buscar dados da ordem para criar o lote
      const { data: ordem } = await supabase
        .from('ordens_producao')
        .select('produto_id, quantidade, tipo_embalagem')
        .eq('id', id)
        .single();

      if (ordem) {
        // Criar lote
        const { data: novoLote, error: loteError } = await supabase
          .from('lotes')
          .insert({
            codigo: codigoLote,
            produto_id: ordem.produto_id,
            quantidade_produzida: ordem.quantidade,
            tipo_embalagem: ordem.tipo_embalagem,
            status: 'em_analise',
            ordem_producao_id: id,
            created_by: req.user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (loteError) {
          throw loteError;
        }

        updateData.lote_id = novoLote.id;
      }
    }

    // Se mudando para "finalizada", registrar fim da produção
    if (status === 'finalizada') {
      updateData.fim_producao = new Date().toISOString();
    }

    const { data: ordemAtualizada, error } = await supabase
      .from('ordens_producao')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        produto:produtos(id, nome, codigo),
        lote:lotes(id, codigo, status)
      `)
      .single();

    if (error || !ordemAtualizada) {
      throw createNotFoundError('Ordem de produção');
    }

    res.json({
      message: `Status da ordem atualizado para: ${status}`,
      ordem: ordemAtualizada
    });

  } catch (error) {
    next(error);
  }
});

// ===== ANÁLISE GRANULOMÉTRICA =====

// Listar análises granulométricas
router.get('/analises-granulometricas', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { lote_id } = req.query;
    
    let query = supabase
      .from('analises_granulometricas')
      .select(`
        *,
        lote:lotes(id, codigo, produto:produtos(nome))
      `)
      .order('created_at', { ascending: false });

    if (lote_id) {
      query = query.eq('lote_id', lote_id);
    }

    const { data: analises, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      analises: analises || []
    });

  } catch (error) {
    next(error);
  }
});

// Buscar análise granulométrica por ID
router.get('/analises-granulometricas/:id', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: analise, error } = await supabase
      .from('analises_granulometricas')
      .select(`
        *,
        lote:lotes(*, produto:produtos(*))
      `)
      .eq('id', id)
      .single();

    if (error || !analise) {
      throw createNotFoundError('Análise granulométrica');
    }

    res.json({ analise });

  } catch (error) {
    next(error);
  }
});

// Criar análise granulométrica
router.post('/analises-granulometricas', analiseGranulometricaValidation, requireSector('manufatura'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const {
      lote_id,
      pesagens,
      quantidade_produzida_turno,
      quantidade_finos,
      observacoes
    } = req.body;

    // Verificar se o lote existe
    const { data: lote } = await supabase
      .from('lotes')
      .select('id, codigo, produto:produtos(nome)')
      .eq('id', lote_id)
      .single();

    if (!lote) {
      return res.status(404).json({
        error: 'Lote não encontrado',
        code: 'LOTE_NOT_FOUND'
      });
    }

    // Calcular tamanho efetivo e coeficiente de uniformidade
    const resultados = calcularParametrosGranulometricos(pesagens);

    // Calcular porcentagem de finos
    const porcentagemFinos = quantidade_finos && quantidade_produzida_turno 
      ? (quantidade_finos / (quantidade_finos + quantidade_produzida_turno)) * 100 
      : null;

    const { data: novaAnalise, error } = await supabase
      .from('analises_granulometricas')
      .insert({
        lote_id,
        pesagens,
        tamanho_efetivo: resultados.tamanhoEfetivo,
        coeficiente_uniformidade: resultados.coeficienteUniformidade,
        quantidade_produzida_turno,
        quantidade_finos,
        porcentagem_finos: porcentagemFinos,
        observacoes,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        lote:lotes(id, codigo, produto:produtos(nome))
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      message: 'Análise granulométrica criada com sucesso',
      analise: novaAnalise,
      resultados
    });

  } catch (error) {
    next(error);
  }
});

// Função para calcular parâmetros granulométricos
function calcularParametrosGranulometricos(pesagens) {
  // Ordenar pesagens por tamanho de peneira (decrescente)
  const pesagensOrdenadas = pesagens.sort((a, b) => parseFloat(b.peneira) - parseFloat(a.peneira));
  
  let pesoTotal = 0;
  let pesoAcumulado = 0;
  let d10 = null;
  let d60 = null;

  // Calcular peso total
  pesagensOrdenadas.forEach(p => {
    pesoTotal += parseFloat(p.peso);
  });

  // Calcular percentuais acumulados
  pesagensOrdenadas.forEach(p => {
    pesoAcumulado += parseFloat(p.peso);
    const percentualAcumulado = (pesoAcumulado / pesoTotal) * 100;
    
    // Encontrar D10 (10% passante)
    if (percentualAcumulado >= 10 && d10 === null) {
      d10 = parseFloat(p.peneira);
    }
    
    // Encontrar D60 (60% passante)
    if (percentualAcumulado >= 60 && d60 === null) {
      d60 = parseFloat(p.peneira);
    }
  });

  const tamanhoEfetivo = d10;
  const coeficienteUniformidade = d10 && d60 ? d60 / d10 : null;

  return {
    tamanhoEfetivo,
    coeficienteUniformidade,
    foraEspecificacao: coeficienteUniformidade && (coeficienteUniformidade < 2 || coeficienteUniformidade > 6)
  };
}

// Buscar histórico de análises de um lote
router.get('/lotes/:lote_id/analises', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { lote_id } = req.params;

    const { data: analises, error } = await supabase
      .from('analises_granulometricas')
      .select('*')
      .eq('lote_id', lote_id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) {
      throw error;
    }

    res.json({
      analises: analises || []
    });

  } catch (error) {
    next(error);
  }
});

// ===== EQUIPAMENTOS =====

// Listar equipamentos
router.get('/equipamentos', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { data: equipamentos, error } = await supabase
      .from('equipamentos')
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

// Criar equipamento
router.post('/equipamentos', requireSector('manufatura'), async (req, res, next) => {
  try {
    const {
      nome,
      codigo,
      tipo,
      localizacao,
      data_ultima_manutencao,
      proxima_manutencao,
      observacoes
    } = req.body;

    const { data: novoEquipamento, error } = await supabase
      .from('equipamentos')
      .insert({
        nome,
        codigo,
        tipo,
        localizacao,
        data_ultima_manutencao,
        proxima_manutencao,
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
      message: 'Equipamento criado com sucesso',
      equipamento: novoEquipamento
    });

  } catch (error) {
    next(error);
  }
});

// Atualizar equipamento
router.put('/equipamentos/:id', requireSector('manufatura'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updated_at = new Date().toISOString();
    updateData.updated_by = req.user.id;

    const { data: equipamentoAtualizado, error } = await supabase
      .from('equipamentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !equipamentoAtualizado) {
      throw createNotFoundError('Equipamento');
    }

    res.json({
      message: 'Equipamento atualizado com sucesso',
      equipamento: equipamentoAtualizado
    });

  } catch (error) {
    next(error);
  }
});

// Estatísticas do módulo manufatura
router.get('/stats', requireSector('manufatura'), async (req, res, next) => {
  try {
    // Contar ordens por status
    const { data: ordens } = await supabase
      .from('ordens_producao')
      .select('status');

    // Contar lotes por status
    const { data: lotes } = await supabase
      .from('lotes')
      .select('status');

    // Contar equipamentos
    const { data: equipamentos } = await supabase
      .from('equipamentos')
      .select('proxima_manutencao');

    const hoje = new Date();
    const equipamentosVencendo = equipamentos?.filter(e => {
      if (!e.proxima_manutencao) return false;
      const dataVencimento = new Date(e.proxima_manutencao);
      const diffDias = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
      return diffDias <= 30 && diffDias >= 0;
    }).length || 0;

    const stats = {
      ordens_producao: {
        total: ordens?.length || 0,
        pendente: ordens?.filter(o => o.status === 'pendente').length || 0,
        em_producao: ordens?.filter(o => o.status === 'em_producao').length || 0,
        finalizada: ordens?.filter(o => o.status === 'finalizada').length || 0,
        cancelada: ordens?.filter(o => o.status === 'cancelada').length || 0
      },
      lotes: {
        total: lotes?.length || 0,
        em_analise: lotes?.filter(l => l.status === 'em_analise').length || 0,
        aprovado: lotes?.filter(l => l.status === 'aprovado').length || 0,
        reprovado: lotes?.filter(l => l.status === 'reprovado').length || 0
      },
      equipamentos: {
        total: equipamentos?.length || 0,
        vencendo_manutencao: equipamentosVencendo
      }
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
