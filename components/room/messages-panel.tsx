import { format } from "date-fns";

import type { ChatMessage } from "@/components/room/types";

type MessagesPanelProps = {
  messages: ChatMessage[];
  username: string;
};

export function MessagesPanel({ messages, username }: MessagesPanelProps) {
  return (
    <section className="flex-1 border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
      <div className="h-full min-h-80 rounded border border-zinc-800 bg-zinc-950/70 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet. Start the conversation.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isCurrentUserMessage = message.sender === username;

              return (
                <article key={message.id} className="space-y-1">
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
  );
}

