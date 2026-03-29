import { create } from "zustand";

import type { TypingPayload } from "@/types";

interface ChatState {
  selectedChatId: string | null;
  typingByChat: Record<string, Record<string, TypingPayload>>;
  setSelectedChatId: (id: string | null) => void;
  setTypingUser: (payload: TypingPayload) => void;
  clearTypingUser: (chatId: string, userId: string) => void;
  clearTypingChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedChatId: null,
  typingByChat: {},
  setSelectedChatId: (id) => set({ selectedChatId: id }),
  setTypingUser: (payload) =>
    set((state) => {
      const current = state.typingByChat[payload.chatId] ?? {};
      const nextChat = { ...current };
      if (payload.isTyping) {
        nextChat[payload.userId] = payload;
      } else {
        delete nextChat[payload.userId];
      }
      return {
        typingByChat: {
          ...state.typingByChat,
          [payload.chatId]: nextChat,
        },
      };
    }),
  clearTypingUser: (chatId, userId) =>
    set((state) => {
      const nextChat = { ...(state.typingByChat[chatId] ?? {}) };
      delete nextChat[userId];
      return {
        typingByChat: {
          ...state.typingByChat,
          [chatId]: nextChat,
        },
      };
    }),
  clearTypingChat: (chatId) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatId]: {},
      },
    })),
}));
