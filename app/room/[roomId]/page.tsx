"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { MessageComposer } from "@/components/room/message-composer";
import { MessagesPanel } from "@/components/room/messages-panel";
import { RoomHeader } from "@/components/room/room-header";
import { useRoomChat } from "@/hooks/use-room-chat";
import { useRoomDestroy } from "@/hooks/use-room-destroy";
import { useRoomTtl } from "@/hooks/use-room-ttl";
import { useUsername } from "@/hooks/use-username";

type RoomParams = {
  roomId: string;
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<RoomParams>();
  const roomId = params.roomId;
  const username = useUsername();
  const [isCopied, setIsCopied] = useState(false);
  const [messageText, setMessageText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRoomDestroyed = useCallback(() => {
    router.replace("/?destroyed=true");
  }, [router]);

  const { messages, sendMessage, isSending, sendErrorMessage } = useRoomChat({
    roomId,
    username,
    onDestroyed: handleRoomDestroyed,
  });
  const { destroyRoom, isDestroyingRoom } = useRoomDestroy({
    roomId,
    onDestroyed: handleRoomDestroyed,
  });
  const { timeRemaining } = useRoomTtl({
    roomId,
    onExpired: handleRoomDestroyed,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleCopyLink() {
    const roomLink = `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(roomLink);
    setIsCopied(true);

    window.setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMessage = messageText.trim();
    if (!nextMessage || isSending) {
      return;
    }

    void sendMessage(nextMessage).then(() => {
      setMessageText("");
      inputRef.current?.focus();
    });
  }

  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
        <RoomHeader
          roomId={roomId}
          isCopied={isCopied}
          onCopyLink={handleCopyLink}
          timeRemaining={timeRemaining}
          onDestroyRoom={destroyRoom}
          isDestroyingRoom={isDestroyingRoom}
        />
        <p className="text-xs text-zinc-500">
          connected as{" "}
          <span className="font-mono text-zinc-300">
            {username || "anonymous-user"}
          </span>
        </p>

        <MessagesPanel messages={messages} username={username || "anonymous-user"} />

        <MessageComposer
          inputRef={inputRef}
          messageText={messageText}
          onMessageTextChange={setMessageText}
          onSubmit={handleSubmit}
          isSending={isSending}
          errorMessage={sendErrorMessage}
        />
      </div>
    </main>
  );
}
