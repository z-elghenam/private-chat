import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { ZodError, z } from "zod";

import { AuthError, authenticateRequest } from "@/app/api/[[...slugs]]/auth";
import { redis, ROOM_TTL_SECONDS, roomMessagesKey, roomMetaKey, roomTokensKey } from "@/lib/redis";
import { realtime } from "@/lib/realtime";

const roomQuerySchema = z.object({
  roomId: z.string().min(1),
});

const sendMessageBodySchema = z.object({
  sender: z.string().min(1).max(64),
  text: z.string().min(1).max(4000),
});

type Message = {
  id: string;
  roomId: string;
  token?: string;
  sender: string;
  text: string;
  timestamp: number;
};

export const messagesRouter = new Elysia({
  prefix: "/messages",
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
  .post("/", async ({ request, body, query, set }) => {
    const { roomId: authRoomId, token } = await authenticateRequest(request);
    const { roomId } = roomQuerySchema.parse(query);
    const parsedBody = sendMessageBodySchema.parse(body);
    if (authRoomId !== roomId) {
      set.status = 403;
      return {
        error: "forbidden",
      };
    }

    const nextMessage: Message = {
      id: nanoid(),
      roomId,
      token,
      sender: parsedBody.sender,
      text: parsedBody.text,
      timestamp: Date.now(),
    };

    const messagesKey = roomMessagesKey(roomId);
    await redis.rpush(messagesKey, JSON.stringify(nextMessage));
    await redis.expire(messagesKey, ROOM_TTL_SECONDS);
    await redis.expire(roomMetaKey(roomId), ROOM_TTL_SECONDS);
    await redis.expire(roomTokensKey(roomId), ROOM_TTL_SECONDS);
    await realtime.channel(roomId).emit("chat-message", nextMessage);

    const safeMessage = {
      ...nextMessage,
      token: undefined,
    };

    return {
      ok: true,
      roomId,
      message: safeMessage,
    };
  })
  .get("/", async ({ request, query, set }) => {
    const { roomId: authRoomId, token } = await authenticateRequest(request);
    const { roomId } = roomQuerySchema.parse(query);
    if (authRoomId !== roomId) {
      set.status = 403;
      return {
        error: "forbidden",
      };
    }

    const storedMessages = await redis.lrange<unknown>(roomMessagesKey(roomId), 0, -1);
    const messages = storedMessages
      .map((value) => {
        if (value && typeof value === "object") {
          return value as Message;
        }

        if (typeof value !== "string") {
          return null;
        }

        try {
          return JSON.parse(value) as Message;
        } catch {
          return null;
        }
      })
      .filter((message): message is Message => message !== null)
      .map((message) => {
        if (message.token && message.token !== token) {
          return {
            ...message,
            token: undefined,
          };
        }

        return message;
      });

    return {
      roomId,
      messages,
    };
  });
