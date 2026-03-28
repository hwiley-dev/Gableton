import { useAppRouter } from "../../app/router";
import { useAuthSession } from "../../services/auth/provider";

export function LeftNavRail() {
  const { contentMatch, currentPath, navigate } = useAppRouter();
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
    <nav className="nav-rail" aria-label="Primary navigation">
      <div className="nav-rail__brand">
        <div className="nav-rail__eyebrow">Ableton Collaboration Console</div>
        <h1 className="nav-rail__title">Gableton</h1>
      </div>
      {session ? (
        <div className="nav-rail__user">
          <div className="nav-rail__user-name">{session.user.displayName}</div>
          <div className="nav-rail__user-email">{session.user.email}</div>
        </div>
      ) : null}
      <ul className="nav-rail__list">
        {items.map((item) => (
          <li key={item.label}>
            <button
              className={`nav-rail__item-button${
                currentPath === item.to || currentPath.startsWith(`${item.to}/`) ? " is-active" : ""
              }`}
              onClick={() => navigate(item.to)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="nav-rail__footer">
        <button className="nav-rail__signout" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
