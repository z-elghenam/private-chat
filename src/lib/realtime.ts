import { Realtime } from "@upstash/realtime";
import { z } from "zod";

import { redis } from "@/lib/redis";

export const chatEventsSchema = {
  "chat-message": z.object({
    id: z.string(),
    sender: z.string(),
    text: z.string(),
    timestamp: z.number(),
    roomId: z.string(),
    token: z.string().optional(),
  }),
  "chat-destroy": z.object({
    isDestroyed: z.literal(true),
  }),
} as const;

export const realtime = new Realtime({
  redis,
  schema: chatEventsSchema,
  history: {
    maxLength: 500,
    expireAfterSecs: 600,
  },
});

export type ChatMessageEvent = z.infer<typeof chatEventsSchema["chat-message"]>;
export type ChatDestroyEvent = z.infer<typeof chatEventsSchema["chat-destroy"]>;
export type ChatRealtimeEvent = ChatMessageEvent | ChatDestroyEvent;
