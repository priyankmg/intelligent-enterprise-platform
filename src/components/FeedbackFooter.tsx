"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type SubmitState = "idle" | "loading" | "done" | "error";

export function FeedbackFooter() {
  const pathname = usePathname();
  const [reaction, setReaction] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [textState, setTextState] = useState<SubmitState>("idle");
  const [reactionState, setReactionState] = useState<SubmitState>("idle");

  const submitReaction = async (r: "thumbs_up" | "thumbs_down") => {
    if (reactionState !== "idle") return;
    setReaction(r);
    setReactionState("loading");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reaction", reaction: r, page: pathname }),
      });
      setReactionState("done");
    } catch {
      setReactionState("error");
    }
  };

  const submitText = async () => {
    if (!message.trim() || textState !== "idle") return;
    setTextState("loading");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", name: name.trim() || undefined, message: message.trim(), page: pathname }),
      });
      setTextState("done");
      setMessage("");
      setName("");
      setTimeout(() => { setExpanded(false); setTextState("idle"); }, 2000);
    } catch {
      setTextState("error");
    }
  };

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-subtle)] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-start gap-6 justify-between">

          {/* Reaction */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted)]">Do you like this?</span>
            {reactionState === "done" ? (
              <span className="text-xs text-[var(--success)]">Thanks for your feedback!</span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => submitReaction("thumbs_up")}
                  disabled={reactionState !== "idle"}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors disabled:opacity-50 ${
                    reaction === "thumbs_up"
                      ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--success)] hover:text-[var(--success)] hover:bg-[var(--success)]/10"
                  }`}
                  aria-label="Thumbs up"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => submitReaction("thumbs_down")}
                  disabled={reactionState !== "idle"}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors disabled:opacity-50 ${
                    reaction === "thumbs_down"
                      ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  }`}
                  aria-label="Thumbs down"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Text feedback toggle */}
          <div className="flex-1 min-w-0">
            {!expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
              >
                Leave detailed feedback →
              </button>
            ) : (
              <div className="space-y-2 max-w-xl">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={textState !== "idle"}
                  className="w-full sm:w-48 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                />
                <div className="flex items-start gap-2">
                  <textarea
                    placeholder="Share your feedback…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    disabled={textState !== "idle"}
                    className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                  />
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={submitText}
                      disabled={!message.trim() || textState !== "idle"}
                      className="btn-primary text-xs !py-1.5 !px-3 disabled:opacity-50"
                    >
                      {textState === "loading" ? "Submitting…" : textState === "done" ? "Submitted!" : "Submit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setExpanded(false); setTextState("idle"); setMessage(""); setName(""); }}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)] text-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {textState === "error" && <span className="text-xs text-[var(--danger)]">Failed. Try again.</span>}
              </div>
            )}
          </div>

        </div>
      </div>
    </footer>
  );
}
