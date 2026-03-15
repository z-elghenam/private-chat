import type { FormEvent, RefObject } from "react";

type MessageComposerProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSending: boolean;
  errorMessage: string | null;
};

export function MessageComposer({
  inputRef,
  messageText,
  onMessageTextChange,
  onSubmit,
  isSending,
  errorMessage,
}: MessageComposerProps) {
  return (
    <section className="border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
      <form className="flex gap-2" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          name="message"
          placeholder="type a message..."
          value={messageText}
          onChange={(event) => onMessageTextChange(event.target.value)}
          className="flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!messageText.trim() || isSending}
          className="bg-zinc-100 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-50"
        >
          {isSending ? "sending..." : "send"}
        </button>
      </form>
      {errorMessage ? <p className="mt-2 text-sm text-red-300">{errorMessage}</p> : null}
    </section>
  );
}

