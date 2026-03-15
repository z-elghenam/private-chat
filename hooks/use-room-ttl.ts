"use client";

import { useEffect, useState } from "react";

type UseRoomTtlParams = {
  roomId: string;
  onExpired: () => void;
};

export function useRoomTtl({ roomId, onExpired }: UseRoomTtlParams) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRoomTtl() {
      const response = await fetch(`/api/room/ttl?roomId=${roomId}`);

      if (!response.ok) {
        setTimeRemaining(null);
        return;
      }

      const payload = (await response.json()) as { ttlSeconds?: number };
      if (!isMounted) {
        return;
      }

      setTimeRemaining(typeof payload.ttlSeconds === "number" ? payload.ttlSeconds : null);
    }

    void loadRoomTtl();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (timeRemaining === null) {
      return;
    }

    if (timeRemaining <= 0) {
      onExpired();
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current === null) {
          return null;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [onExpired, timeRemaining]);

  return {
    timeRemaining,
  };
}

