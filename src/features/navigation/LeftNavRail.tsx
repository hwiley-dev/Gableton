import { useAppRouter } from "../../app/router";
import { useAuthSession } from "../../services/auth/provider";

export function LeftNavRail() {
  const { contentMatch, navigate } = useAppRouter();
  const { session, signOut } = useAuthSession();
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
      {session ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#4b5563" }}>
          <div style={{ fontWeight: 600, color: "#111827" }}>{session.user.displayName}</div>
          <div>{session.user.email}</div>
        </div>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item.label} style={{ padding: "10px 0" }}>
            <button onClick={() => navigate(item.to)} style={{ width: "100%", textAlign: "left" }}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => void signOut()}
        style={{ marginTop: 24, width: "100%", textAlign: "left" }}
      >
        Sign out
      </button>
    </nav>
  );
}
