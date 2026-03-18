import type { PropsWithChildren } from "react";
import { AppFrame } from "../../app/AppFrame";
import { LeftNavRail } from "../navigation/LeftNavRail";
import { ProjectProviders } from "./ProjectProviders";
import { ProjectTopStatusBar } from "./ProjectTopStatusBar";
import { ProjectContextPanel } from "./ProjectContextPanel";

export function ProjectShell({ children }: PropsWithChildren) {
  return (
    <ProjectProviders>
      <AppFrame
        leftNav={<LeftNavRail />}
        topBar={<ProjectTopStatusBar />}
        contextPanel={<ProjectContextPanel />}
      >
        {children}
      </AppFrame>
    </ProjectProviders>
  );
}
