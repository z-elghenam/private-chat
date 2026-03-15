"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ChatMessage } from "@/components/room/types";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";

type UseRoomChatParams = {
  roomId: string;
  username: string;
  onDestroyed: () => void;
};

type RealtimeEvent =
  | {
      event: "chat-message";
      channel: string;
      data: ChatMessage;
    }
  | {
      event: "chat-destroy";
      channel: string;
      data: { isDestroyed: true };
    };

function extractMessages(result: unknown): ChatMessage[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const directMessages = (result as { messages?: unknown }).messages;
  if (Array.isArray(directMessages)) {
    return directMessages as ChatMessage[];
  }

  const nestedMessages = (result as { data?: { messages?: unknown } }).data?.messages;
  if (Array.isArray(nestedMessages)) {
    return nestedMessages as ChatMessage[];
  }

  return [];
}

export function useRoomChat({ roomId, username, onDestroyed }: UseRoomChatParams) {
  const queryClient = useQueryClient();
  const seenRealtimeMessageIdsRef = useRef<Set<string>>(new Set());

  const messagesQuery = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const response = await client.api.messages.get({
        $query: {
          roomId,
        },
      });

      return extractMessages(response.data);
    },
    refetchOnWindowFocus: false,
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  useEffect(() => {
    for (const message of messages) {
      seenRealtimeMessageIdsRef.current.add(message.id);
    }
  }, [messages]);

  const invalidateMessages = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["messages", roomId],
    });
  }, [queryClient, roomId]);

  const handleRealtimeData = useCallback(
    (event: RealtimeEvent) => {
      if (event.event === "chat-message") {
        if (seenRealtimeMessageIdsRef.current.has(event.data.id)) {
          return;
        }

        seenRealtimeMessageIdsRef.current.add(event.data.id);
        invalidateMessages();
        return;
      }

      if (event.event === "chat-destroy") {
        onDestroyed();
      }
    },
    [invalidateMessages, onDestroyed],
  );

  useRealtime({
    channels: [roomId],
    events: ["chat-message", "chat-destroy"] as const,
    onData: handleRealtimeData,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch(`/api/messages?roomId=${roomId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: username || "anonymous-user",
          text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    },
    onSuccess: invalidateMessages,
  });

  const sendMessage = useCallback(
    async (text: string) => {
      await sendMessageMutation.mutateAsync(text);
    },
    [sendMessageMutation],
  );

  return {
    messages,
    sendMessage,
    isSending: sendMessageMutation.isPending,
    sendErrorMessage:
      sendMessageMutation.error instanceof Error
        ? sendMessageMutation.error.message
        : null,
  };
}

