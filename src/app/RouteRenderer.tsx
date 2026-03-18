import type { AppRoute } from "./types";
import { AppFrame } from "./AppFrame";
import { LeftNavRail } from "../features/navigation/LeftNavRail";
import { ProjectShell } from "../features/project-shell/ProjectShell";

interface RouteRendererProps {
  route: AppRoute;
}

export function RouteRenderer({ route }: RouteRendererProps) {
  const Component = route.component;

  if (route.shell === "project") {
    return (
      <ProjectShell>
        <Component />
      </ProjectShell>
    );
  }

  return (
    <AppFrame leftNav={<LeftNavRail />}>
      <Component />
    </AppFrame>
  );
}
