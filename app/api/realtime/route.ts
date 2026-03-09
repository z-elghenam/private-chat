import { handle } from "@upstash/realtime";

import { realtime } from "@/lib/realtime";

const realtimeHandler = handle({
  realtime,
});

export const GET = realtimeHandler;
