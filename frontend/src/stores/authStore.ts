import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'comercial' | 'manufatura' | 'qualidade';
  sector: 'comercial' | 'manufatura' | 'qualidade';
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Ações
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await api.post('/api/auth/login', {
            email,
            password,
          });

          const { token, user } = response.data;

          // Persistir token para os interceptors e futuras sessões
          localStorage.setItem('token', token);

          // Configurar token no axios
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Erro ao fazer login - v2';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Remover token do axios e do localStorage
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      verifyToken: async () => {
        const { token } = get();
        const localToken = localStorage.getItem('token');
        
        if (!token && !localToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          set({ isLoading: true });

          // Garantir header do axios
          const useToken = token || (localToken as string);
          api.defaults.headers.common['Authorization'] = `Bearer ${useToken}`;

          const response = await api.get('/api/auth/verify');
          const { user } = response.data;

          // Reforçar token no localStorage
          if (useToken) localStorage.setItem('token', useToken);

          set({
            user,
            token: useToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          // Token inválido ou expirado
          delete api.defaults.headers.common['Authorization'];
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
