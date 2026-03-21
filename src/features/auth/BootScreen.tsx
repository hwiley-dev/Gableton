export function BootScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f3f4f6",
        color: "#111827"
      }}
    >
      <div style={{ width: 360, padding: 32, border: "1px solid #d7d7d7", borderRadius: 12, background: "#ffffff" }}>
        <h1 style={{ marginTop: 0 }}>Gableton</h1>
        <p style={{ marginBottom: 0 }}>Restoring your collaboration session.</p>
      </div>
    </div>
  );
}
