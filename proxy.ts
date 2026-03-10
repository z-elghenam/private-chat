import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { redis, roomMetaKey, roomTokensKey } from "@/lib/redis";

const ROOM_PATH_REGEX = /^\/room\/([^/]+)/;
const TOKEN_COOKIE_NAME = "x-token";
const CLIENT_ID_COOKIE_NAME = "pc-client-id";
const MAX_ROOM_USERS = 2;
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function roomClientTokenKey(roomId: string, fingerprint: string): string {
  return `room:${roomId}:client:${fingerprint}`;
}

function hashString(input: string): string {
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function getClientFingerprint(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() ?? "unknown-ip";
  const userAgent = request.headers.get("user-agent") ?? "unknown-agent";
  const language = request.headers.get("accept-language") ?? "unknown-language";

  return hashString(`${clientIp}|${userAgent}|${language}`);
}

function withTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return response;
}

function withClientIdCookie(response: NextResponse, clientId: string): NextResponse {
  response.cookies.set(CLIENT_ID_COOKIE_NAME, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return response;
}

function isNonUserRequest(request: NextRequest): boolean {
  if (request.nextUrl.searchParams.has("_rsc")) {
    return true;
  }

  const purpose = request.headers.get("purpose")?.toLowerCase() ?? "";
  if (purpose.includes("prefetch")) {
    return true;
  }

  const secFetchDest = request.headers.get("sec-fetch-dest")?.toLowerCase() ?? "";
  const secFetchMode = request.headers.get("sec-fetch-mode")?.toLowerCase() ?? "";
  if (secFetchDest && secFetchDest !== "document" && secFetchMode !== "navigate") {
    return true;
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (
    /(bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slackbot|discordbot)/.test(
      userAgent,
    )
  ) {
    return true;
  }

  return false;
}

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
  const existsCount = await redis.exists(roomMetaKey(roomId));
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

  const tokensKey = roomTokensKey(roomId);
  const clientId =
    request.cookies.get(CLIENT_ID_COOKIE_NAME)?.value ??
    `fp-${getClientFingerprint(request)}`;
  const clientKey = roomClientTokenKey(roomId, clientId);
  const existingToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const hasValidExistingToken = existingToken
    ? (await redis.sismember(tokensKey, existingToken)) === 1
    : false;

  if (hasValidExistingToken) {
    return withClientIdCookie(
      withTokenCookie(NextResponse.next(), existingToken!),
      clientId,
    );
  }

  const previouslyAssignedToken = await redis.get<string>(clientKey);
  if (previouslyAssignedToken) {
    return withClientIdCookie(
      withTokenCookie(NextResponse.next(), previouslyAssignedToken),
      clientId,
    );
  }

  if (isNonUserRequest(request)) {
    return withClientIdCookie(NextResponse.next(), clientId);
  }

  const connectedUsers = await redis.scard(tokensKey);
  if (connectedUsers >= MAX_ROOM_USERS) {
    return redirectToLobby(request, { error: "room-full" });
  }

  const authToken = nanoid();
  const reservedClientToken = await redis.set(clientKey, authToken, {
    nx: true,
    ex: TOKEN_TTL_SECONDS,
  });

  if (reservedClientToken !== "OK") {
    const concurrentToken = await redis.get<string>(clientKey);
    if (concurrentToken) {
      return withClientIdCookie(
        withTokenCookie(NextResponse.next(), concurrentToken),
        clientId,
      );
    }
  }

  await redis.sadd(tokensKey, authToken);
  await redis.expire(tokensKey, TOKEN_TTL_SECONDS);

  return withClientIdCookie(withTokenCookie(NextResponse.next(), authToken), clientId);
}

export const config = {
  matcher: ["/room/:path*"],
};
