import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

const ROOM_PATH_REGEX = /^\/room\/([^/]+)/;
const TOKEN_COOKIE_NAME = "x-token";
const MAX_ROOM_USERS = 2;
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

const redis = Redis.fromEnv();

function redirectToLobby(
  request: NextRequest,
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/", request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

function getRoomId(pathname: string): string | null {
  const match = ROOM_PATH_REGEX.exec(pathname);
  return match?.[1] ?? null;
}

async function roomExists(roomId: string): Promise<boolean> {
  const existsCount = await redis.exists(`room:${roomId}`, `room:${roomId}:meta`);
  return existsCount > 0;
}

export async function proxy(request: NextRequest) {
  const roomId = getRoomId(request.nextUrl.pathname);

  if (!roomId) {
    return redirectToLobby(request, { error: "room-not-found" });
  }

  const exists = await roomExists(roomId);
  if (!exists) {
    return redirectToLobby(request, { error: "room-not-found" });
  }

  const roomTokensKey = `room:${roomId}:tokens`;
  const existingToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const hasValidExistingToken = existingToken
    ? (await redis.sismember(roomTokensKey, existingToken)) === 1
    : false;

  if (hasValidExistingToken) {
    const response = NextResponse.next();
    response.cookies.set(TOKEN_COOKIE_NAME, existingToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_TTL_SECONDS,
    });
    return response;
  }

  const connectedUsers = await redis.scard(roomTokensKey);
  if (connectedUsers >= MAX_ROOM_USERS) {
    return redirectToLobby(request, { error: "room-full" });
  }

  const authToken = nanoid();
  await redis.sadd(roomTokensKey, authToken);
  await redis.expire(roomTokensKey, TOKEN_TTL_SECONDS);

  const response = NextResponse.next();
  response.cookies.set(TOKEN_COOKIE_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return response;
}

export const config = {
  matcher: ["/room/:path*"],
};
