import { Elysia } from "elysia";
import { z } from "zod";

const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+.+$/, {
    message: "Expected Authorization header in the format: Bearer <token>",
  }),
});

export const authMiddleware = new Elysia({
  name: "auth-middleware",
}).derive(({ request, set }) => {
  const parsedHeaders = authHeaderSchema.safeParse({
    authorization: request.headers.get("authorization"),
  });

  if (!parsedHeaders.success) {
    set.status = 401;
    return {
      authToken: null as string | null,
      authError: {
        error: "unauthorized",
        message: parsedHeaders.error.issues[0]?.message ?? "Unauthorized",
      },
    };
  }

  const token = parsedHeaders.data.authorization.replace(/^Bearer\s+/, "").trim();

  return {
    authToken: token,
    authError: null as { error: string; message: string } | null,
  };
});
