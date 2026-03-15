"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/client";

type UseRoomDestroyParams = {
  roomId: string;
  onDestroyed: () => void;
};

export function useRoomDestroy({ roomId, onDestroyed }: UseRoomDestroyParams) {
  const destroyRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.room.delete({
        $query: {
          roomId,
        },
      });

      if (response.error) {
        throw new Error("Failed to destroy room");
      }
    },
    onSuccess: onDestroyed,
  });

  const destroyRoom = useCallback(() => {
    destroyRoomMutation.mutate();
  }, [destroyRoomMutation]);

  return {
    destroyRoom,
    isDestroyingRoom: destroyRoomMutation.isPending,
  };
}

