import { Elysia } from "elysia";

import { redis, roomTokensKey } from "@/lib/redis";

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = "AuthError";
    this.status = 401;
  }
}

function getRoomIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const queryRoomId = url.searchParams.get("roomId");
  if (queryRoomId) {
    return queryRoomId;
  }

  const pathnameMatch = /^\/api\/room\/([^/]+)/.exec(url.pathname);
  if (pathnameMatch?.[1]) {
    return pathnameMatch[1];
  }

  return request.headers.get("x-room-id");
}

function getTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const headerToken = authorization.slice("Bearer ".length).trim();
    if (headerToken) {
      return headerToken;
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("x-token="));

  if (!tokenCookie) {
    return null;
  }

  const value = tokenCookie.slice("x-token=".length);
  return value || null;
}

export const auth = new Elysia({
  name: "auth",
})
  .derive(async ({ request }) => {
    const roomId = getRoomIdFromRequest(request);
    if (!roomId) {
      throw new AuthError("Missing room ID");
    }

    const token = getTokenFromRequest(request);
    if (!token) {
      throw new AuthError("Missing authentication token");
    }

    const connected = (await redis.sismember(roomTokensKey(roomId), token)) === 1;
    if (!connected) {
      throw new AuthError("Invalid authentication token");
    }

    return {
      roomId,
      token,
      connected,
    };
  })
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = 401;
      return {
        error: "unauthorized",
        message: error.message,
      };
    }
  });
