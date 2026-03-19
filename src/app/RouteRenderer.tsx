import { useAppRouter } from "./router";
import { AppFrame } from "./AppFrame";
import { LeftNavRail } from "../features/navigation/LeftNavRail";
import { ProjectShell } from "../features/project-shell/ProjectShell";
import { ModalOverlay } from "../features/shared/ModalOverlay";

export function RouteRenderer() {
  const { contentMatch, modalMatch } = useAppRouter();
  const ContentComponent = contentMatch.route.component;
  const ModalComponent = modalMatch?.route.component;
  const projectId = contentMatch.params.projectId;
  const modalHost = ModalComponent ? (
    <ModalOverlay>
      <ModalComponent />
    </ModalOverlay>
  ) : undefined;

  if (contentMatch.route.shell === "project") {
    if (!projectId) {
      throw new Error("Project routes require a projectId parameter.");
    }
    return (
      <ProjectShell projectId={projectId} modalHost={modalHost}>
        <ContentComponent />
      </ProjectShell>
    );
  }

  return (
    <AppFrame leftNav={<LeftNavRail />} modalHost={modalHost}>
      <ContentComponent />
    </AppFrame>
  );
}
