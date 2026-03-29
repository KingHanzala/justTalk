import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addMember, createChat, deleteMessage, getChat, listChats, listMessages, removeMember, searchUsers, sendMessage } from "@/services/chatService";
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

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, messageId }: { chatId: string; messageId: string }) => deleteMessage(chatId, messageId),
    onSuccess: (message) => {
      queryClient.setQueryData(queryKeys.messages(message.chatId), (current: Message[] | undefined) => {
        const existing = current ?? [];
        return existing.map((item) => (item.id === message.id ? message : item));
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, userId }: { chatId: string; userId: string }) => removeMember(chatId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(variables.chatId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(variables.chatId) });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, userId }: { chatId: string; userId: string }) => addMember(chatId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(variables.chatId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(variables.chatId) });
    },
  });
}
