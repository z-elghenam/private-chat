import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { ZodError, z } from "zod";

import { AuthError, authenticateRequest } from "@/app/api/[[...slugs]]/auth";
import {
  ROOM_TTL_SECONDS,
  parseRoomMeta,
  redis,
  roomHistoryKey,
  roomMessagesKey,
  roomMetaKey,
  roomTokensKey,
} from "@/lib/redis";
import { realtime } from "@/lib/realtime";

const createRoomBodySchema = z.object({}).optional();

const roomTtlQuerySchema = z.object({
  roomId: z.string().min(1),
});

const destroyRoomQuerySchema = z.object({
  roomId: z.string().min(1),
});

export const roomsRouter = new Elysia({
  prefix: "/room",
})
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = 401;
      return {
        error: "unauthorized",
        message: error.message,
      };
    }

    if (error instanceof ZodError) {
      set.status = 400;
      return {
        error: "validation_error",
        issues: error.issues,
      };
    }
  })
  .post("/", async ({ body }) => {
    createRoomBodySchema.parse(body);

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
  .group("", (protectedApp) => {
    return protectedApp
      .get("/ttl", async ({ request, query, set }) => {
        const { roomId: authRoomId } = await authenticateRequest(request);
        const { roomId } = roomTtlQuerySchema.parse(query);
        if (roomId !== authRoomId) {
          set.status = 403;
          return {
            error: "forbidden",
          };
        }

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
      .delete("/", async ({ request, query, set }) => {
        const { roomId: authRoomId } = await authenticateRequest(request);
        const parsedQuery = destroyRoomQuerySchema.parse(query);
        if (parsedQuery.roomId !== authRoomId) {
          set.status = 403;
          return {
            error: "forbidden",
          };
        }

        const key = roomMetaKey(parsedQuery.roomId);
        const room = await redis.hgetall(key);

        if (!room) {
          set.status = 404;
          return {
            error: "room_not_found",
          };
        }

        await realtime.channel(parsedQuery.roomId).emit("chat-destroy", {
          isDestroyed: true,
        });
        await Promise.all([
          redis.del(key),
          redis.del(roomMessagesKey(parsedQuery.roomId)),
          redis.del(roomTokensKey(parsedQuery.roomId)),
          redis.del(roomHistoryKey(parsedQuery.roomId)),
        ]);

        return {
          ok: true,
          roomId: parsedQuery.roomId,
        };
      });
  });
