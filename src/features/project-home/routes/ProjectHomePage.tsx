import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { selectWorkspaceSummary } from "../../../state/selectors/projectSelectors";

export function ProjectHomePage() {
  const { state } = useProjectStateMachine();
  const workspaceSummary = selectWorkspaceSummary(state);

  return (
    <PageScaffold title="Project Home">
      <SectionCard title="Workspace status">
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Latest approved version">
        <p>Tighten chorus drums by Maya, 2h ago.</p>
      </SectionCard>
      <SectionCard title="Open change requests">
        <p>{state.context.openChangeRequest?.title ?? "No open change requests."}</p>
      </SectionCard>
    </PageScaffold>
  );
}
