import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createChat, getChat, listChats, listMessages, searchUsers, sendMessage } from "@/services/chatService";
import type { CreateChatRequest, Message, SendMessageRequest } from "@/types";
import { queryKeys } from "@/utils/constants";

export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats,
    queryFn: listChats,
    refetchInterval: 10_000,
  });
}

export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? queryKeys.chat(chatId) : ["chats", "empty"],
    queryFn: () => getChat(chatId!),
    enabled: Boolean(chatId),
  });
}

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? queryKeys.messages(chatId) : ["messages", "empty"],
    queryFn: () => listMessages(chatId!),
    enabled: Boolean(chatId),
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatRequest) => createChat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: queryKeys.users(query),
    queryFn: () => searchUsers(query),
    enabled: query.length > 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, data }: { chatId: string; data: SendMessageRequest }) => sendMessage(chatId, data),
    onSuccess: (message) => {
      queryClient.setQueryData(queryKeys.messages(message.chatId), (current: Message[] | undefined) => {
        const existing = current ?? [];
        if (existing.some((item) => item.id === message.id)) {
          return existing;
        }
        return [...existing, message];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}
