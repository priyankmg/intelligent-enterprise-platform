export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>404</h1>
      <p style={{ color: "#8b949e" }}>This page could not be found.</p>
      <a
        href="/"
        style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#58a6ff", color: "#fff", textDecoration: "none" }}
      >
        Go home
      </a>
    </div>
  );
}
