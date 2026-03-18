import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { selectEnvironmentSummary, selectWorkspaceSummary } from "../../../state/selectors/projectSelectors";

export function WorkspacePage() {
  const { state } = useProjectStateMachine();
  const workspaceSummary = selectWorkspaceSummary(state);
  const environmentSummary = selectEnvironmentSummary(state);

  return (
    <PageScaffold title="Workspace">
      <SectionCard title="Workspace path">
        <p>{state.context.workspacePath}</p>
      </SectionCard>
      <SectionCard title="Local change summary">
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Environment diagnostics">
        <ul>
          {environmentSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </PageScaffold>
  );
}
