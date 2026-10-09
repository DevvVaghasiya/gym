import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  references?: string[];
  followUpQuestions?: string[];
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) =>
        set((s) => ({
          messages: s.messages.some(existing => existing.id === msg.id)
            ? s.messages
            : [...s.messages, msg],
        })),
      clear: () => set({ messages: [] }),
    }),
    { name: 'gym-chat-storage' }
  )
);
