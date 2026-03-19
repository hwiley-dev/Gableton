import { useAppRouter } from "../../app/router";

export function LeftNavRail() {
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const items = [
    { label: "Projects", to: "/projects" },
    { label: "Home", to: projectId ? `/projects/${projectId}/home` : "/projects" },
    { label: "Workspace", to: projectId ? `/projects/${projectId}/workspace` : "/projects" },
    { label: "Versions", to: projectId ? `/projects/${projectId}/versions` : "/projects" },
    {
      label: "Change Requests",
      to: projectId ? `/projects/${projectId}/change-requests` : "/projects"
    },
    { label: "Settings", to: projectId ? `/projects/${projectId}/settings` : "/projects" }
  ];

  return (
    <nav aria-label="Primary navigation">
      <h1 style={{ marginTop: 0 }}>Gableton</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item.label} style={{ padding: "10px 0" }}>
            <button onClick={() => navigate(item.to)} style={{ width: "100%", textAlign: "left" }}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
