import { Elysia } from "elysia";

import { messagesRouter } from "@/server/routers/messages";
import { roomsRouter } from "@/server/routers/rooms";

const app = new Elysia({
  aot: false,
  prefix: "/api",
})
  .get("/", () => ({
    ok: true,
    service: "private-chat-api",
  }))
  .use(messagesRouter)
  .use(roomsRouter)
  .all("/*", () => new Response("Not Found", { status: 404 }));

const handler = (request: Request) => app.handle(request);

export type App = typeof app;

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
