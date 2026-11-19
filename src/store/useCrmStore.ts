import { create } from 'zustand';
import type { CrmRoute } from '../types/crm.ts';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
}

interface CrmState {
  activeRoute: CrmRoute;
  selectedCustomerId: string | null;
  selectedConversationId: string | null;
  globalSearch: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  wsConnected: boolean;
  toasts: ToastMessage[];
  setRoute: (route: CrmRoute) => void;
  openCustomerDetail: (customerId: string) => void;
  openConversation: (conversationId: string) => void;
  setGlobalSearch: (q: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('realty_crm_theme');
  return saved === 'dark' ? 'dark' : 'light';
};

export const useCrmStore = create<CrmState>((set) => ({
  activeRoute: 'dashboard',
  selectedCustomerId: null,
  selectedConversationId: null,
  globalSearch: '',
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  wsConnected: false,
  toasts: [],
  setRoute: (activeRoute) => set({ activeRoute, mobileMenuOpen: false }),
  openCustomerDetail: (customerId) =>
    set({ selectedCustomerId: customerId, activeRoute: 'customer-detail', mobileMenuOpen: false }),
  openConversation: (conversationId) =>
    set({ selectedConversationId: conversationId, activeRoute: 'inbox', mobileMenuOpen: false }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
        window.localStorage.setItem('realty_crm_theme', next);
      }
      return { theme: next };
    }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      window.localStorage.setItem('realty_crm_theme', theme);
    }
    set({ theme });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  pushToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
