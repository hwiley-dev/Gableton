import { useAppRouter } from "../../../app/router";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { SectionCard } from "../../shared/SectionCard";

export function UpdateBlockedModal() {
  const { state, commands } = useProjectStateMachine();
  const { navigate, closeModal } = useAppRouter();

  return (
    <SectionCard title="Update blocked">
      <p>You have local changes that are not saved yet. Save a version before updating.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={closeModal}>Cancel</button>
        <button
          onClick={async () => {
            const result = await commands.openSaveVersionModal();
            if (result.ok) {
              navigate(`/projects/${state.context.projectId}/save-version`, { modal: true });
            }
          }}
        >
          Save version first
        </button>
      </div>
    </SectionCard>
  );
}
