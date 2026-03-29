import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { createChatWebSocket } from "@/services/websocketService";
import type { Message, WebSocketPayload } from "@/types";
import { queryKeys } from "@/utils/constants";

export function useWebSocket(chatId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

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
        queryClient.setQueryData(queryKeys.messages(chatId), (current: Message[] | undefined) => {
          const messages = current ?? [];
          const existingIndex = messages.findIndex((message) => message.id === payload.data.id);
          if (existingIndex >= 0) {
            const next = [...messages];
            next[existingIndex] = payload.data;
            return next;
          }
          if (payload.type !== "message") {
            return messages;
          }
          return [...messages, payload.data];
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      };

      websocket.onclose = () => {
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
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [chatId, queryClient]);

  return {
    connected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
