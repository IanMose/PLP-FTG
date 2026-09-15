"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "What happened recently?",
  "Which sites are most at risk?",
  "Tell me about the Sinai 2011 fire",
  "Tell me about the Thange judgment",
  "What CAPAs are overdue?",
  "How fast does Sentinel respond?",
];

export function AiChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi — I'm Sentinel AI. Ask me anything about your pipeline system, incidents, alerts, ESG metrics, or corrective actions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "ai", text: data.answer ?? "No response received." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Could not reach the backend. Make sure Sentinel is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-violet-600 hover:bg-violet-700 text-white",
          open && "rotate-0 scale-95"
        )}
        aria-label="Open Sentinel AI"
      >
        {open ? (
          <ChevronDown className="size-5" />
        ) : (
          <Bot className="size-6" />
        )}
        {/* Pulse ring */}
        {!open && (
          <span className="absolute size-14 rounded-full border-2 border-violet-400 animate-ping opacity-30" />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex flex-col",
            "w-[340px] sm:w-[380px] h-[500px]",
            "rounded-2xl border bg-background shadow-2xl overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-violet-600 text-white flex-shrink-0">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sentinel AI</p>
              <p className="text-[10px] opacity-70">
                Ask anything about your pipeline system
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {m.role === "ai" && (
                  <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 mt-0.5">
                    <Bot className="size-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <Bot className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions — show only when only 1 message (the greeting) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                Suggested
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border bg-muted px-2.5 py-1 text-[11px] hover:bg-muted/80 transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t px-3 py-2 flex-shrink-0 flex items-center gap-2 bg-background">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about incidents, alerts, ESG..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground py-1.5"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
