import { Redis } from "@upstash/redis";

export const ROOM_TTL_SECONDS = 600;

export type RoomMetaHash = {
  connected: string;
  createdAt: string;
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

export const redis = Redis.fromEnv();

export function parseRoomMeta(raw: RoomMetaHash | null): RoomMeta | null {
  if (!raw) {
    return null;
  }

  const connected = JSON.parse(raw.connected) as string[];
  const createdAt = Number(raw.createdAt);

  if (!Array.isArray(connected) || Number.isNaN(createdAt)) {
    return null;
  }

  return {
    connected,
    createdAt,
  };
}
