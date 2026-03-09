import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { ZodError, z } from "zod";

import {
  ROOM_TTL_SECONDS,
  parseRoomMeta,
  redis,
  roomMetaKey,
} from "@/lib/redis";
import { authMiddleware } from "@/server/middleware/auth";

const createRoomBodySchema = z.object({}).optional();

const roomTtlQuerySchema = z.object({
  roomId: z.string().min(1),
});

const destroyRoomBodySchema = z.object({
  roomId: z.string().min(1),
});

export const roomsRouter = new Elysia({
  prefix: "/room",
})
  .onError(({ error, set }) => {
    if (error instanceof ZodError) {
      set.status = 400;
      return {
        error: "validation_error",
        issues: error.issues,
      };
    }
  })
  .post("/", async ({ request }) => {
    const rawBody = request.headers.get("content-length")
      ? ((await request.json()) as unknown)
      : undefined;
    createRoomBodySchema.parse(rawBody);

    const roomId = nanoid(8);
    const key = roomMetaKey(roomId);
    const createdAt = Date.now();

    await redis.hset(key, {
      connected: JSON.stringify([]),
      createdAt: String(createdAt),
    });
    await redis.expire(key, ROOM_TTL_SECONDS);

    return {
      roomId,
    };
  })
  .group("", (protectedApp) =>
    protectedApp
      .use(authMiddleware)
      .get("/ttl", ({ query, authError, authToken, set }) => {
        if (authError || !authToken) {
          set.status = 401;
          return authError;
        }

        const { roomId } = roomTtlQuerySchema.parse(query);
        const key = roomMetaKey(roomId);
        const room = parseRoomMeta(await redis.hgetall(key));

        if (!room) {
          set.status = 404;
          return {
            error: "room_not_found",
          };
        }

        return {
          roomId,
          ttlSeconds: await redis.ttl(key),
          createdAt: room.createdAt,
          connected: room.connected,
        };
      })
      .delete("/", async ({ request, authError, authToken, set }) => {
        if (authError || !authToken) {
          set.status = 401;
          return authError;
        }

        const body = destroyRoomBodySchema.parse(await request.json());
        const key = roomMetaKey(body.roomId);
        const room = await redis.hgetall(key);

        if (!room) {
          set.status = 404;
          return {
            error: "room_not_found",
          };
        }

        await redis.del(key);

        return {
          ok: true,
          roomId: body.roomId,
        };
      }),
  );
