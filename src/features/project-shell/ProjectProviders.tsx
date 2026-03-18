import type { PropsWithChildren } from "react";
import { ProjectStateMachineProvider } from "../../state/project-machine/provider";

export function ProjectProviders({ children }: PropsWithChildren) {
  return <ProjectStateMachineProvider>{children}</ProjectStateMachineProvider>;
}
