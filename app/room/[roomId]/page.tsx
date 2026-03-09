"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";

type RoomParams = {
  roomId: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  token?: string;
  sender: string;
  text: string;
  timestamp: number;
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

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<RoomParams>();
  const username = useUsername();
  const queryClient = useQueryClient();
  const [isCopied, setIsCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const seenRealtimeMessageIdsRef = useRef<Set<string>>(new Set());
  const messagesQuery = useQuery({
    queryKey: ["messages", params.roomId],
    queryFn: async () => {
      const response = await client.api.messages.get({
        $query: {
          roomId: params.roomId,
        },
      });

      return extractMessages(response.data);
    },
    refetchOnWindowFocus: false,
  });
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch(`/api/messages?roomId=${params.roomId}`, {
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
    onSuccess: () => {
      setMessageText("");
      inputRef.current?.focus();
      void queryClient.invalidateQueries({
        queryKey: ["messages", params.roomId],
      });
    },
  });
  const destroyRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.room.delete({
        $query: {
          roomId: params.roomId,
        },
      });

      if (response.error) {
        throw new Error("Failed to destroy room");
      }
    },
    onSuccess: () => {
      router.replace("/?destroyed=true");
    },
  });

  useEffect(() => {
    for (const message of messages) {
      seenRealtimeMessageIdsRef.current.add(message.id);
    }
  }, [messages]);

  const handleRealtimeData = useCallback(
    (
      event:
        | {
            event: "chat-message";
            channel: string;
            data: ChatMessage;
          }
        | {
            event: "chat-destroy";
            channel: string;
            data: { isDestroyed: true };
          },
    ) => {
      if (event.event === "chat-message") {
        if (seenRealtimeMessageIdsRef.current.has(event.data.id)) {
          return;
        }

        seenRealtimeMessageIdsRef.current.add(event.data.id);
        void queryClient.invalidateQueries({
          queryKey: ["messages", params.roomId],
        });
      }

      if (event.event === "chat-destroy") {
        router.replace("/?destroyed=true");
      }
    },
    [params.roomId, queryClient, router],
  );

  useRealtime({
    channels: [params.roomId],
    events: ["chat-message", "chat-destroy"] as const,
    onData: handleRealtimeData,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRoomTtl() {
      const response = await fetch(`/api/room/ttl?roomId=${params.roomId}`);

      if (!response.ok) {
        setTimeRemaining(null);
        return;
      }

      const payload = (await response.json()) as { ttlSeconds?: number };
      if (!isMounted) {
        return;
      }

      setTimeRemaining(
        typeof payload.ttlSeconds === "number" ? payload.ttlSeconds : null,
      );
    }

    void loadRoomTtl();

    return () => {
      isMounted = false;
    };
  }, [params.roomId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timeRemaining === null) {
      return;
    }

    if (timeRemaining <= 0) {
      router.replace("/?destroyed=true");
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current === null) {
          return null;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router, timeRemaining]);

  async function handleCopyLink() {
    const roomLink = `${window.location.origin}/room/${params.roomId}`;
    await navigator.clipboard.writeText(roomLink);
    setIsCopied(true);

    window.setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMessage = messageText.trim();
    if (!nextMessage || sendMessageMutation.isPending) {
      return;
    }

    sendMessageMutation.mutate(nextMessage);
  }

  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">room id</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-zinc-200">{params.roomId}</p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                {isCopied ? "copied" : "copy link"}
              </button>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-zinc-500">self-destruct timer</p>
            <p
              className={`font-mono text-sm ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-400"
                  : "text-amber-300"
              }`}
            >
              {timeRemaining === null ? "--:--" : formatTimer(timeRemaining)}
            </p>
            <button
              type="button"
              onClick={() => destroyRoomMutation.mutate()}
              disabled={destroyRoomMutation.isPending}
              className="border border-red-900 bg-red-950/40 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/70"
            >
              {destroyRoomMutation.isPending
                ? "💣 destroying..."
                : "💣 destroy room"}
            </button>
          </div>
        </header>
        <p className="text-xs text-zinc-500">
          connected as <span className="font-mono text-zinc-300">{username || "anonymous-user"}</span>
        </p>

        <section className="flex-1 border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
          <div className="h-full min-h-80 rounded border border-zinc-800 bg-zinc-950/70 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No messages yet. Start the conversation.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => {
                  const isCurrentUserMessage = message.sender === username;

                  return (
                    <article key={`${message.timestamp}-${index}`} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={
                            isCurrentUserMessage
                              ? "font-semibold text-green-400"
                              : "font-semibold text-blue-400"
                          }
                        >
                          {isCurrentUserMessage ? "you" : message.sender}
                        </span>
                        <span className="text-zinc-500">
                          {format(new Date(message.timestamp), "hh:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200">{message.text}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              name="message"
              placeholder="type a message..."
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              className="flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="bg-zinc-100 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-50"
            >
              {sendMessageMutation.isPending ? "sending..." : "send"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
