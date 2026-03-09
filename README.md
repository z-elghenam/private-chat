# Private Chat

A private, self-destructing chat room app built with Next.js, Elysia, Upstash Redis, and Upstash Realtime.

## Features

- Lobby page with username generation and room creation
- Protected room routes with token-based access
- Real-time messaging across connected clients
- 10-minute room TTL with countdown timer
- Room destruction with data wipe and real-time broadcast
- Error handling for:
  - full room
  - room not found/expired
  - unauthorized access

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- TanStack Query
- Elysia + Eden client
- Upstash Redis
- Upstash Realtime
- Tailwind CSS
- date-fns

## Environment Variables

Create `.env` with:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main Routes

- `/` lobby page
- `/room/[roomId]` room page
- `/api/[[...slugs]]` Elysia API catch-all
- `/api/realtime` Upstash Realtime handler

## High-Level Architecture

- `proxy.ts`:
  - guards `/room/:path*`
  - validates room existence/capacity
  - issues `x-token` cookie
- `src/server/routers/rooms.ts`:
  - create room
  - fetch TTL
  - destroy room (emit `chat-destroy`, delete metadata/messages/tokens/history)
- `src/server/routers/messages.ts`:
  - send message
  - fetch message history
  - emits `chat-message`
- `app/room/[roomId]/page.tsx`:
  - query message history
  - subscribe to realtime events
  - handle timer and destruction redirects

## Scripts

- `npm run dev` start development server
- `npm run lint` run ESLint
- `npm run build` create production build
- `npm run start` run production server
