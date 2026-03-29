import { create } from "zustand";

interface ChatState {
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedChatId: null,
  setSelectedChatId: (id) => set({ selectedChatId: id }),
}));
