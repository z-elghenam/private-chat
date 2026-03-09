import { edenTreaty } from "@elysiajs/eden";

import type { App } from "@/app/api/[[...slugs]]/route";

export const client = edenTreaty<App>("/");

export type ApiClient = typeof client;
