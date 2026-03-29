import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { createChatWebSocket } from "@/services/websocketService";
import type { Message, TypingPayload, WebSocketPayload } from "@/types";
import { useChatStore } from "@/store/use-chat-store";
import { queryKeys } from "@/utils/constants";

export function useWebSocket(chatId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const typingTimeoutsRef = useRef<Record<string, number>>({});
  const queryClient = useQueryClient();
  const { clearTypingChat, clearTypingUser, setTypingUser } = useChatStore();

  useEffect(() => {
    if (!chatId) {
      return;
    }

    let closedByCleanup = false;

    const connect = () => {
      const websocket = createChatWebSocket(chatId);
      if (!websocket) {
        return;
      }

      websocket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as WebSocketPayload;
        if (payload.type === "typing") {
          const typing = payload.data as TypingPayload;
          setTypingUser(typing);
          const timeoutKey = `${typing.chatId}:${typing.userId}`;
          if (typingTimeoutsRef.current[timeoutKey]) {
            window.clearTimeout(typingTimeoutsRef.current[timeoutKey]);
          }
          typingTimeoutsRef.current[timeoutKey] = window.setTimeout(() => {
            clearTypingUser(typing.chatId, typing.userId);
          }, 2500);
          return;
        }

        queryClient.setQueryData(queryKeys.messages(chatId), (current: Message[] | undefined) => {
          const messages = current ?? [];
          const data = payload.data as Message;
          const existingIndex = messages.findIndex((message) => message.id === data.id);
          if (existingIndex >= 0) {
            const next = [...messages];
            next[existingIndex] = data;
            return next;
          }
          if (payload.type !== "message") {
            return messages;
          }
          return [...messages, data];
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      };

      websocket.onclose = () => {
        clearTypingChat(chatId);
        queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(chatId) });
        if (closedByCleanup) {
          return;
        }
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      websocket.onerror = () => {
        websocket.close();
      };

      wsRef.current = websocket;
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      clearTypingChat(chatId);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [chatId, clearTypingChat, clearTypingUser, queryClient, setTypingUser]);

  const sendTyping = (isTyping: boolean) => {
    if (!chatId || wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: "typing", data: { isTyping } }));
  };

  return {
    connected: wsRef.current?.readyState === WebSocket.OPEN,
    sendTyping,
  };
}
