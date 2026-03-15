type RoomHeaderProps = {
  roomId: string;
  isCopied: boolean;
  onCopyLink: () => void | Promise<void>;
  timeRemaining: number | null;
  onDestroyRoom: () => void;
  isDestroyingRoom: boolean;
};

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RoomHeader({
  roomId,
  isCopied,
  onCopyLink,
  timeRemaining,
  onDestroyRoom,
  isDestroyingRoom,
}: RoomHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">room id</p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm text-zinc-200">{roomId}</p>
          <button
            type="button"
            onClick={onCopyLink}
            className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            {isCopied ? "copied" : "copy link"}
          </button>
        </div>
      </div>
      <div className="space-y-1 text-right">
        <p className="text-xs text-zinc-500">self-destruct timer</p>
        <p
          className={`font-mono text-sm ${
            timeRemaining !== null && timeRemaining < 60
              ? "text-red-400"
              : "text-amber-300"
          }`}
        >
          {timeRemaining === null ? "--:--" : formatTimer(timeRemaining)}
        </p>
        <button
          type="button"
          onClick={onDestroyRoom}
          disabled={isDestroyingRoom}
          className="border border-red-900 bg-red-950/40 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/70"
        >
          {isDestroyingRoom ? "destroying..." : "destroy room"}
        </button>
      </div>
    </header>
  );
}

