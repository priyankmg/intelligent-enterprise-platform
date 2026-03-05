"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "40vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: "#8b949e", textAlign: "center", maxWidth: "28rem" }}>{error.message}</p>
      <button
        onClick={reset}
        style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#58a6ff", color: "#fff", border: "none", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
