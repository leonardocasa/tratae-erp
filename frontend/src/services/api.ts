import axios from 'axios';
import toast from 'react-hot-toast';

// Configuração da API base
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          toast.error('Sessão expirada. Faça login novamente.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Acesso negado. Você não tem permissão para esta ação.');
          break;
        case 404:
          toast.error('Recurso não encontrado.');
          break;
        case 422:
          if (data.errors) {
            data.errors.forEach((err: any) => {
              toast.error(err.msg || 'Erro de validação');
            });
          } else {
            toast.error(data.message || 'Erro de validação');
          }
          break;
        case 500:
          toast.error('Erro interno do servidor. Tente novamente.');
          break;
        default:
          toast.error(data.message || 'Erro inesperado');
      }
    } else if (error.request) {
      toast.error('Erro de conexão. Verifique sua internet.');
    } else {
      toast.error('Erro inesperado');
    }
    
    return Promise.reject(error);
  }
);

// Serviços específicos
export const authService = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/login', credentials),
  register: (userData: any) => api.post('/api/auth/register', userData),
  verifyToken: () => api.get('/api/auth/verify'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/auth/change-password', data),
  logout: () => api.post('/api/auth/logout'),
};

export const cnpjService = {
  consultar: (cnpj: string) => api.get(`/api/cnpj/consultar/${cnpj}`),
  validar: (cnpj: string) => api.get(`/api/cnpj/validar/${cnpj}`),
  formatar: (cnpj: string) => api.get(`/api/cnpj/formatar/${cnpj}`),
};

export const comercialService = {
  // Entidades (clientes, fornecedores, transportadoras)
  listarEntidades: (params?: any) => api.get('/api/comercial/entidades', { params }),
  obterEntidade: (id: string) => api.get(`/api/comercial/entidades/${id}`),
  criarEntidade: (data: any) => api.post('/api/comercial/entidades', data),
  atualizarEntidade: (id: string, data: any) => api.put(`/api/comercial/entidades/${id}`, data),
  excluirEntidade: (id: string) => api.delete(`/api/comercial/entidades/${id}`),

  // Ordens de Coleta
  listarOrdensColeta: (params?: any) => api.get('/api/comercial/ordens-coleta', { params }),
  obterOrdemColeta: (id: string) => api.get(`/api/comercial/ordens-coleta/${id}`),
  criarOrdemColeta: (data: any) => api.post('/api/comercial/ordens-coleta', data),
  atualizarStatus: (id: string, status: string, observacoes?: string) =>
    api.patch(`/api/comercial/ordens-coleta/${id}/status`, { status, observacoes }),
  excluirOrdemColeta: (id: string) => api.delete(`/api/comercial/ordens-coleta/${id}`),
};

export const manufaturaService = {
  // Ordens de Produção
  listarOrdensProducao: () => api.get('/api/manufatura/ordens-producao'),
  obterOrdemProducao: (id: string) => api.get(`/api/manufatura/ordens-producao/${id}`),
  criarOrdemProducao: (data: any) => api.post('/api/manufatura/ordens-producao', data),
  atualizarOrdemProducao: (id: string, data: any) => api.put(`/api/manufatura/ordens-producao/${id}`, data),
  excluirOrdemProducao: (id: string) => api.delete(`/api/manufatura/ordens-producao/${id}`),
  
  // Análises Granulométricas
  listarAnalisesGranulometricas: () => api.get('/api/manufatura/analises-granulometricas'),
  obterAnaliseGranulometrica: (id: string) => api.get(`/api/manufatura/analises-granulometricas/${id}`),
  criarAnaliseGranulometrica: (data: any) => api.post('/api/manufatura/analises-granulometricas', data),
  atualizarAnaliseGranulometrica: (id: string, data: any) => api.put(`/api/manufatura/analises-granulometricas/${id}`, data),
  excluirAnaliseGranulometrica: (id: string) => api.delete(`/api/manufatura/analises-granulometricas/${id}`),
  
  // Equipamentos
  listarEquipamentos: () => api.get('/api/manufatura/equipamentos'),
  obterEquipamento: (id: string) => api.get(`/api/manufatura/equipamentos/${id}`),
  criarEquipamento: (data: any) => api.post('/api/manufatura/equipamentos', data),
  atualizarEquipamento: (id: string, data: any) => api.put(`/api/manufatura/equipamentos/${id}`, data),
  excluirEquipamento: (id: string) => api.delete(`/api/manufatura/equipamentos/${id}`),
};

export const qualidadeService = {
  // Produtos
  listarProdutos: () => api.get('/api/qualidade/produtos'),
  obterProduto: (id: string) => api.get(`/api/qualidade/produtos/${id}`),
  criarProduto: (data: any) => api.post('/api/qualidade/produtos', data),
  atualizarProduto: (id: string, data: any) => api.put(`/api/qualidade/produtos/${id}`, data),
  excluirProduto: (id: string) => api.delete(`/api/qualidade/produtos/${id}`),
  
  // Características Físico-Químicas
  listarCaracteristicas: () => api.get('/api/qualidade/caracteristicas'),
  obterCaracteristica: (id: string) => api.get(`/api/qualidade/caracteristicas/${id}`),
  criarCaracteristica: (data: any) => api.post('/api/qualidade/caracteristicas', data),
  atualizarCaracteristica: (id: string, data: any) => api.put(`/api/qualidade/caracteristicas/${id}`, data),
  excluirCaracteristica: (id: string) => api.delete(`/api/qualidade/caracteristicas/${id}`),
  
  // Análises de Lotes
  listarAnalisesLotes: () => api.get('/api/qualidade/analises-lotes'),
  obterAnaliseLote: (id: string) => api.get(`/api/qualidade/analises-lotes/${id}`),
  criarAnaliseLote: (data: any) => api.post('/api/qualidade/analises-lotes', data),
  atualizarAnaliseLote: (id: string, data: any) => api.put(`/api/qualidade/analises-lotes/${id}`, data),
  excluirAnaliseLote: (id: string) => api.delete(`/api/qualidade/analises-lotes/${id}`),
  
  // Equipamentos de Calibração
  listarEquipamentosCalibracao: () => api.get('/api/qualidade/equipamentos-calibracao'),
  obterEquipamentoCalibracao: (id: string) => api.get(`/api/qualidade/equipamentos-calibracao/${id}`),
  criarEquipamentoCalibracao: (data: any) => api.post('/api/qualidade/equipamentos-calibracao', data),
  atualizarEquipamentoCalibracao: (id: string, data: any) => api.put(`/api/qualidade/equipamentos-calibracao/${id}`, data),
  excluirEquipamentoCalibracao: (id: string) => api.delete(`/api/qualidade/equipamentos-calibracao/${id}`),
  
  // Normas Técnicas
  listarNormasTecnicas: () => api.get('/api/qualidade/normas-tecnicas'),
  obterNormaTecnica: (id: string) => api.get(`/api/qualidade/normas-tecnicas/${id}`),
  criarNormaTecnica: (data: any) => api.post('/api/qualidade/normas-tecnicas', data),
  atualizarNormaTecnica: (id: string, data: any) => api.put(`/api/qualidade/normas-tecnicas/${id}`, data),
  excluirNormaTecnica: (id: string) => api.delete(`/api/qualidade/normas-tecnicas/${id}`),
};

export const usersService = {
  listarUsuarios: () => api.get('/api/users'),
  obterUsuario: (id: string) => api.get(`/api/users/${id}`),
  atualizarUsuario: (id: string, data: any) => api.put(`/api/users/${id}`, data),
  excluirUsuario: (id: string) => api.delete(`/api/users/${id}`),
  listarPorSetor: (setor: string) => api.get(`/api/users/setor/${setor}`),
  obterEstatisticas: () => api.get('/api/users/stats'),
};

export default api;
