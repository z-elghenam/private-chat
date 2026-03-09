"use client";

import { useSearchParams } from "next/navigation";

import { useUsername } from "@/hooks/use-username";

type LobbyError = {
  title: string;
  subtitle: string;
} | null;

function getLobbyError(
  destroyed: string | null,
  error: string | null,
): LobbyError {
  if (destroyed === "true") {
    return {
      title: "room destroyed",
      subtitle: "All messages were permanently deleted.",
    };
  }

  if (error === "room-not-found") {
    return {
      title: "room not found",
      subtitle: "This room may have expired or never existed.",
    };
  }

  if (error === "room-full") {
    return {
      title: "room full",
      subtitle: "This room is at maximum capacity.",
    };
  }

  return null;
}

export function Lobby() {
  const searchParams = useSearchParams();
  const username = useUsername();

  const lobbyError = getLobbyError(
    searchParams.get("destroyed"),
    searchParams.get("error"),
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <section className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {"{private chat}"}
          </h1>
          <p>A private self-destructing chat room.</p>
        </section>

        {lobbyError ? (
          <section className="border border-red-900 bg-red-950/50 p-4">
            <p className="font-bold text-red-200">{lobbyError.title}</p>
            <p className="text-sm text-red-300">{lobbyError.subtitle}</p>
          </section>
        ) : null}

        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-2">
            <label className="flex items-center text-zinc-500">
              your identity
            </label>
            <div className="bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
              {username || "anonymous-user"}
            </div>
            <button
              type="button"
              className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
            >
              create secure room
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
