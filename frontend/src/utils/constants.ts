export const STORAGE_KEYS = {
  authToken: "chat_token",
};

export const queryKeys = {
  me: ["auth", "me"] as const,
  chats: ["chats"] as const,
  chat: (chatId: string) => ["chats", chatId] as const,
  messages: (chatId: string) => ["chats", chatId, "messages"] as const,
  users: (query: string) => ["users", "search", query] as const,
};
