import type { PropsWithChildren } from "react";
import { ProjectStateMachineProvider } from "../../state/project-machine/provider";

interface ProjectProvidersProps extends PropsWithChildren {
  projectId: string;
}

export function ProjectProviders({ children, projectId }: ProjectProvidersProps) {
  return <ProjectStateMachineProvider projectId={projectId}>{children}</ProjectStateMachineProvider>;
}
