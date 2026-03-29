import { apiRequest } from "@/services/api";
import type { ChatDetail, ChatSummary, CreateChatRequest, Message, SendMessageRequest, SuccessResponse, User } from "@/types";

export function listChats() {
  return apiRequest<ChatSummary[]>("/api/chats");
}

export function getChat(chatId: string) {
  return apiRequest<ChatDetail>(`/api/chats/${chatId}`);
}

export function createChat(data: CreateChatRequest) {
  return apiRequest<ChatSummary>("/api/chats", {
    method: "POST",
    body: data,
  });
}

export function listMessages(chatId: string) {
  return apiRequest<Message[]>(`/api/chats/${chatId}/messages`);
}

export function sendMessage(chatId: string, data: SendMessageRequest) {
  return apiRequest<Message>(`/api/chats/${chatId}/messages`, {
    method: "POST",
    body: data,
  });
}

export function deleteMessage(chatId: string, messageId: string) {
  return apiRequest<Message>(`/api/chats/${chatId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function removeMember(chatId: string, userId: string) {
  return apiRequest<SuccessResponse>(`/api/chats/${chatId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function searchUsers(query: string) {
  return apiRequest<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
}
