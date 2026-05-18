import { create } from 'zustand';

interface UserState {
  isAuthenticated: boolean;
  user: null | { id: string; name: string; role: string };
  login: () => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: () => set({ isAuthenticated: true, user: { id: '1', name: 'Admin', role: 'root' } }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));

interface ChatState {
  messages: Array<{ id: string; role: 'user' | 'agent' | 'system'; content: string }>;
  addMessage: (msg: { id: string; role: 'user' | 'agent' | 'system'; content: string }) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    { id: 'init', role: 'system', content: 'Cognitive OS Initialized. Waiting for commands...' }
  ],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
}));
