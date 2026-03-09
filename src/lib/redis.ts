import { Redis } from "@upstash/redis";

export const ROOM_TTL_SECONDS = 600;

export type RoomMetaHash = {
  connected?: unknown;
  createdAt?: unknown;
};

export type RoomMeta = {
  connected: string[];
  createdAt: number;
};

export function roomMetaKey(roomId: string): string {
  return `meta:${roomId}`;
}

export function roomTokensKey(roomId: string): string {
  return `room:${roomId}:tokens`;
}

export function roomMessagesKey(roomId: string): string {
  return `messages:${roomId}`;
}

export function roomHistoryKey(roomId: string): string {
  return roomId;
}

export const redis = Redis.fromEnv();

export function parseRoomMeta(raw: RoomMetaHash | null): RoomMeta | null {
  if (!raw) {
    return null;
  }

  let connected: string[] = [];

  if (Array.isArray(raw.connected)) {
    connected = raw.connected.filter(
      (value): value is string => typeof value === "string",
    );
  } else if (typeof raw.connected === "string" && raw.connected.length > 0) {
    try {
      const parsedConnected = JSON.parse(raw.connected) as unknown;
      if (Array.isArray(parsedConnected)) {
        connected = parsedConnected.filter(
          (value): value is string => typeof value === "string",
        );
      }
    } catch {
      connected = [];
    }
  }

  const createdAt = Number(raw.createdAt);

  if (Number.isNaN(createdAt)) {
    return null;
  }

  return {
    connected,
    createdAt,
  };
}
