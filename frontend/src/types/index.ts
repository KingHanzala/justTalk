export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface ChatMember {
  userId: string;
  username: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface ChatSummary {
  id: string;
  name: string | null;
  isGroup: boolean;
  lastMessage: Message | null;
  memberCount: number;
  createdAt: string;
}

export interface ChatDetail {
  id: string;
  name: string | null;
  isGroup: boolean;
  members: ChatMember[];
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
}

export interface CreateChatRequest {
  isGroup: boolean;
  name: string | null;
  memberUserIds: string[];
}

export interface SendMessageRequest {
  content: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface WebSocketPayload {
  type: "message";
  data: Message;
}
