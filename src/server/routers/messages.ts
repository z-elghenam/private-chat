import { Elysia } from "elysia";
import { ZodError, z } from "zod";

import { authMiddleware } from "@/server/middleware/auth";

const roomQuerySchema = z.object({
  roomId: z.string().min(1),
});

const sendMessageBodySchema = z.object({
  sender: z.string().min(1).max(64),
  text: z.string().min(1).max(4000),
});

type Message = {
  sender: string;
  text: string;
  createdAt: number;
};

const roomMessagesStore = new Map<string, Message[]>();

export const messagesRouter = new Elysia({
  prefix: "/messages",
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
  .use(authMiddleware)
  .post("/", async ({ request, query, authError, authToken, set }) => {
    if (authError || !authToken) {
      set.status = 401;
      return authError;
    }

    const { roomId } = roomQuerySchema.parse(query);
    const body = sendMessageBodySchema.parse(await request.json());

    const nextMessage: Message = {
      sender: body.sender,
      text: body.text,
      createdAt: Date.now(),
    };

    const existingMessages = roomMessagesStore.get(roomId) ?? [];
    existingMessages.push(nextMessage);
    roomMessagesStore.set(roomId, existingMessages);

    return {
      ok: true,
      roomId,
      message: nextMessage,
    };
  })
  .get("/", ({ query, authError, authToken, set }) => {
    if (authError || !authToken) {
      set.status = 401;
      return authError;
    }

    const { roomId } = roomQuerySchema.parse(query);

    return {
      roomId,
      messages: roomMessagesStore.get(roomId) ?? [],
    };
  });
