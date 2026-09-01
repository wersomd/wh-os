"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { runJarvis, confirmJarvis } from "@/features/jarvis/actions";
import type {
  JarvisMessage,
  JarvisResult,
  PendingAction,
} from "@/features/jarvis/types";

export default function JarvisBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setInput("");
    setMessages([]);
    setAnswer("");
    setPending(null);
    setBusy(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function apply(result: JarvisResult) {
    setMessages(result.messages);
    setAnswer(result.assistantText);
    setPending(result.pendingAction);
    setBusy(false);
  }

  async function submit() {
    const text = input.trim();
    if (!text || busy) return;
    const next: JarvisMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setAnswer("");
    setPending(null);
    setBusy(true);
    apply(await runJarvis(next));
  }

  async function decide(approved: boolean) {
    if (!pending || busy) return;
    setBusy(true);
    const p = pending;
    setPending(null);
    apply(await confirmJarvis(messages, p, approved));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Sparkles className="size-4 text-primary" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Спросите Джарвиса…  (например: сколько я потратил в июле?)"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {busy && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {(answer || pending || busy) && (
          <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm">
            {busy && !answer && <p className="text-muted-foreground">Думаю…</p>}
            {answer && <p className="whitespace-pre-wrap">{answer}</p>}
            {pending && (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="mb-2 font-medium">{pending.summary}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(true)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Ок
                  </button>
                  <button
                    onClick={() => decide(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
