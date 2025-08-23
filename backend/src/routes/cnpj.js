const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { createValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validação de CNPJ
const cnpjValidation = [
  body('cnpj')
    .notEmpty()
    .withMessage('CNPJ é obrigatório')
    .matches(/^\d{14}$/)
    .withMessage('CNPJ deve conter exatamente 14 dígitos')
];

// Função para formatar CNPJ
const formatCNPJ = (cnpj) => {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Função para limpar CNPJ
const cleanCNPJ = (cnpj) => {
  return cnpj.replace(/\D/g, '');
};

// Consultar CNPJ na ReceitaWS
router.post('/consultar', cnpjValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(errors.array()[0].msg);
    }

    const { cnpj } = req.body;
    const cleanCnpj = cleanCNPJ(cnpj);

    console.log(`🔍 Consultando CNPJ: ${formatCNPJ(cleanCnpj)}`);

    // Configurar timeout para evitar travamentos
    const timeout = 10000; // 10 segundos

    const response = await axios.get(
      `${process.env.RECEITA_WS_BASE_URL || 'https://receitaws.com.br/v1'}/${cleanCnpj}`,
      {
        timeout,
        headers: {
          'User-Agent': 'TRATAE-ERP/1.0',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data) {
      return res.status(404).json({
        error: 'CNPJ não encontrado',
        code: 'CNPJ_NOT_FOUND'
      });
    }

    // Mapear dados da API para o formato do sistema
    const empresaData = {
      cnpj: cleanCnpj,
      cnpj_formatado: formatCNPJ(cleanCnpj),
      razao_social: response.data.nome || '',
      nome_fantasia: response.data.fantasia || '',
      inscricao_estadual: response.data.inscricao_estadual || '',
      inscricao_municipal: response.data.inscricao_municipal || '',
      data_abertura: response.data.abertura || '',
      situacao: response.data.situacao || '',
      tipo: response.data.tipo || '',
      porte: response.data.porte || '',
      natureza_juridica: response.data.natureza_juridica || '',
      capital_social: response.data.capital_social || '',
      endereco: {
        logradouro: response.data.logradouro || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        municipio: response.data.municipio || '',
        uf: response.data.uf || '',
        cep: response.data.cep || '',
        pais: 'Brasil'
      },
      contato: {
        telefone: response.data.telefone || '',
        email: response.data.email || '',
        site: response.data.site || ''
      },
      atividade_principal: response.data.atividade_principal || [],
      atividades_secundarias: response.data.atividades_secundarias || [],
      quadro_socios: response.data.qsa || [],
      ultima_atualizacao: response.data.ultima_atualizacao || new Date().toISOString(),
      fonte: 'ReceitaWS'
    };

    res.json({
      message: 'CNPJ consultado com sucesso',
      empresa: empresaData
    });

  } catch (error) {
    console.error('❌ Erro na consulta de CNPJ:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Timeout na consulta do CNPJ. Tente novamente.',
        code: 'CNPJ_TIMEOUT'
      });
    }

    if (error.response) {
      const status = error.response.status;
      
      if (status === 404) {
        return res.status(404).json({
          error: 'CNPJ não encontrado na Receita Federal',
          code: 'CNPJ_NOT_FOUND'
        });
      }

      if (status === 429) {
        return res.status(429).json({
          error: 'Limite de consultas excedido. Aguarde um momento.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      return res.status(status).json({
        error: 'Erro na consulta do CNPJ',
        details: error.response.data?.message || 'Erro desconhecido',
        code: 'CNPJ_API_ERROR'
      });
    }

    if (error.request) {
      return res.status(503).json({
        error: 'Serviço de consulta CNPJ indisponível',
        code: 'CNPJ_SERVICE_UNAVAILABLE'
      });
    }

    next(error);
  }
});

// Validar formato de CNPJ
router.post('/validar', cnpjValidation, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        valid: false,
        error: errors.array()[0].msg,
        code: 'INVALID_CNPJ_FORMAT'
      });
    }

    const { cnpj } = req.body;
    const cleanCnpj = cleanCNPJ(cnpj);

    // Algoritmo de validação de CNPJ
    if (cleanCnpj.length !== 14) {
      return res.status(400).json({
        valid: false,
        error: 'CNPJ deve conter exatamente 14 dígitos',
        code: 'INVALID_CNPJ_LENGTH'
      });
    }

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCnpj)) {
      return res.status(400).json({
        valid: false,
        error: 'CNPJ não pode ter todos os dígitos iguais',
        code: 'INVALID_CNPJ_PATTERN'
      });
    }

    // Validar dígitos verificadores
    let soma = 0;
    let peso = 2;

    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cleanCnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    let digito1 = 11 - (soma % 11);
    if (digito1 > 9) digito1 = 0;

    if (parseInt(cleanCnpj.charAt(12)) !== digito1) {
      return res.status(400).json({
        valid: false,
        error: 'Primeiro dígito verificador inválido',
        code: 'INVALID_CNPJ_DIGIT1'
      });
    }

    // Segundo dígito verificador
    soma = 0;
    peso = 2;

    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cleanCnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    let digito2 = 11 - (soma % 11);
    if (digito2 > 9) digito2 = 0;

    if (parseInt(cleanCnpj.charAt(13)) !== digito2) {
      return res.status(400).json({
        valid: false,
        error: 'Segundo dígito verificador inválido',
        code: 'INVALID_CNPJ_DIGIT2'
      });
    }

    res.json({
      valid: true,
      cnpj: cleanCnpj,
      cnpj_formatado: formatCNPJ(cleanCnpj),
      message: 'CNPJ válido'
    });

  } catch (error) {
    next(error);
  }
});

// Formatar CNPJ
router.post('/formatar', (req, res) => {
  try {
    const { cnpj } = req.body;

    if (!cnpj) {
      return res.status(400).json({
        error: 'CNPJ é obrigatório',
        code: 'CNPJ_REQUIRED'
      });
    }

    const cleanCnpj = cleanCNPJ(cnpj);

    if (cleanCnpj.length !== 14) {
      return res.status(400).json({
        error: 'CNPJ deve conter exatamente 14 dígitos',
        code: 'INVALID_CNPJ_LENGTH'
      });
    }

    res.json({
      cnpj: cleanCnpj,
      cnpj_formatado: formatCNPJ(cleanCnpj)
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
