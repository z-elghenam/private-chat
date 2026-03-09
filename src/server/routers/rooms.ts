import { Elysia } from "elysia";
import { customAlphabet } from "nanoid";
import { ZodError, z } from "zod";

import { authMiddleware } from "@/server/middleware/auth";

const createRoomId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);
const DEFAULT_TTL_SECONDS = 15 * 60;

const createRoomBodySchema = z.object({
  ttlSeconds: z.number().int().positive().max(24 * 60 * 60).optional(),
});

const roomTtlQuerySchema = z.object({
  roomId: z.string().min(1),
});

const destroyRoomBodySchema = z.object({
  roomId: z.string().min(1),
});

type RoomRecord = {
  expiresAt: number;
  ownerToken: string;
};

const roomStore = new Map<string, RoomRecord>();

function getTtlRemaining(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

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
    const body = createRoomBodySchema.parse(await request.json());
    const roomId = createRoomId();
    const ttlSeconds = body.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    roomStore.set(roomId, {
      expiresAt,
      ownerToken: "",
    });

    return {
      roomId,
      ttlSeconds,
      expiresAt,
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
        const room = roomStore.get(roomId);

        if (!room) {
          set.status = 404;
          return {
            error: "room_not_found",
          };
        }

        return {
          roomId,
          ttlSeconds: getTtlRemaining(room.expiresAt),
        };
      })
      .delete("/", async ({ request, authError, authToken, set }) => {
        if (authError || !authToken) {
          set.status = 401;
          return authError;
        }

        const body = destroyRoomBodySchema.parse(await request.json());
        const room = roomStore.get(body.roomId);

        if (!room) {
          set.status = 404;
          return {
            error: "room_not_found",
          };
        }

        roomStore.delete(body.roomId);

        return {
          ok: true,
          roomId: body.roomId,
        };
      }),
  );
