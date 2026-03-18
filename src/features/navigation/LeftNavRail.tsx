export function LeftNavRail() {
  const items = ["Projects", "Home", "Workspace", "Versions", "Change Requests", "Settings"];

  return (
    <nav aria-label="Primary navigation">
      <h1 style={{ marginTop: 0 }}>Gableton</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item} style={{ padding: "10px 0" }}>
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}
