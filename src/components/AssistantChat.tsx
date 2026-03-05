"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function formatAssistantMessage(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldStart = remaining.indexOf("**");
    if (boldStart === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    if (boldStart > 0) parts.push(<span key={key++}>{remaining.slice(0, boldStart)}</span>);
    const afterFirst = remaining.slice(boldStart + 2);
    const boldEnd = afterFirst.indexOf("**");
    if (boldEnd === -1) {
      parts.push(<span key={key++}>{remaining.slice(boldStart)}</span>);
      break;
    }
    parts.push(<strong key={key++}>{afterFirst.slice(0, boldEnd)}</strong>);
    remaining = afterFirst.slice(boldEnd + 2);
  }
  return <>{parts}</>;
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const r = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      const reply = data.reply ?? (data.error ? `Error: ${data.error}` : "No response.");
      const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: reply };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      const errMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: `Sorry, something went wrong: ${String(e)}` };
      setMessages((m) => [...m, errMsg]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg hover:bg-[var(--accent-hover)] transition-colors"
        aria-label="Open AI assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-semibold text-[var(--text)]">AI Assistant</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
            Ask employee counts, low leave balance, simulate healing, or database monitoring.
          </p>
          <div className="flex max-h-[320px] min-h-[200px] flex-1 flex-col overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-[var(--muted)] py-4">
                Try: &quot;How many employees are in the database?&quot; or &quot;Simulate API healing for ERP&quot;
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-subtle)] text-[var(--text)] border border-[var(--border)]"
                  }`}
                >
                  {msg.role === "assistant" ? formatAssistantMessage(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                className="min-h-[40px] w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                className="btn-primary self-end shrink-0 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
