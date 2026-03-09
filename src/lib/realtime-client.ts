"use client";

import { createRealtime } from "@upstash/realtime/client";

import { chatEventsSchema } from "@/lib/realtime";
import type { ChatDestroyEvent, ChatMessageEvent } from "@/lib/realtime";

export type RealtimeEvents = typeof chatEventsSchema;
export type RealtimeMessagePayload = ChatMessageEvent;
export type RealtimeDestroyPayload = ChatDestroyEvent;

export const realtimeClient = createRealtime<RealtimeEvents>();
export const useRealtime = realtimeClient.useRealtime;
