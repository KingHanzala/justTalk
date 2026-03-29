import { STORAGE_KEYS } from "@/utils/constants";

const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? "";

export function createChatWebSocket(chatId: string) {
  const token = localStorage.getItem(STORAGE_KEYS.authToken);
  if (!token) {
    return null;
  }

  const baseUrl = WS_BASE_URL
    ? WS_BASE_URL.replace(/\/$/, "")
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

  return new WebSocket(`${baseUrl}/api/ws/${chatId}?token=${encodeURIComponent(token)}`);
}
