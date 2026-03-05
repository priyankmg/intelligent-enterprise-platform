"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0f1419", color: "#e6edf3", fontFamily: "system-ui", padding: "2rem", textAlign: "center", margin: 0 }}>
        <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#8b949e", marginBottom: "1rem" }}>{error.message}</p>
        <button
          onClick={() => reset()}
          style={{ padding: "0.5rem 1rem", background: "#58a6ff", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
