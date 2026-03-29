export interface User {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthFlowResponse {
  token: string | null;
  user: User;
  verificationRequired: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  username: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
}

export type ChatMemberRole = "admin" | "member";

export interface ChatMember {
  userId: string;
  username: string;
  role: ChatMemberRole;
  joinedAt: string;
}

export interface ChatSummary {
  id: string;
  name: string | null;
  isGroup: boolean;
  lastMessage: Message | null;
  memberCount: number;
  unreadCount: number;
  hasUnread: boolean;
  createdAt: string;
}

export interface ChatDetail {
  id: string;
  name: string | null;
  isGroup: boolean;
  members: ChatMember[];
  membershipStatus: "active" | "removed";
  canWrite: boolean;
  unreadCount: number;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
}

export interface VerifyCodeRequest {
  username: string;
  code: string;
}

export interface ResendVerificationRequest {
  username: string;
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

export interface TypingPayload {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface PendingVerification {
  username: string;
  email: string;
}

export interface WebSocketPayload {
  type: "message" | "message_updated" | "typing";
  data: Message | TypingPayload;
}
