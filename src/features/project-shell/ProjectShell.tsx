import type { PropsWithChildren, ReactNode } from "react";
import { AppFrame } from "../../app/AppFrame";
import { LeftNavRail } from "../navigation/LeftNavRail";
import { ProjectProviders } from "./ProjectProviders";
import { ProjectTopStatusBar } from "./ProjectTopStatusBar";
import { ProjectContextPanel } from "./ProjectContextPanel";

interface ProjectShellProps extends PropsWithChildren {
  projectId: string;
  modalHost?: ReactNode;
}

export function ProjectShell({ children, projectId, modalHost }: ProjectShellProps) {
  return (
    <ProjectProviders projectId={projectId}>
      <AppFrame
        leftNav={<LeftNavRail />}
        topBar={<ProjectTopStatusBar />}
        contextPanel={<ProjectContextPanel />}
        modalHost={modalHost}
      >
        {children}
      </AppFrame>
    </ProjectProviders>
  );
}
