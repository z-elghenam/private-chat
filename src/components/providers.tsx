"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { useState } from "react";

import { realtimeClient } from "@/lib/realtime-client";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  void realtimeClient;
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RealtimeProvider
      api={{
        url: "/api/realtime",
        withCredentials: true,
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RealtimeProvider>
  );
}
