import { useAppRouter } from "../../app/router";
import { useProjectStateMachine } from "../../state/project-machine/provider";
import {
  selectPublishBlockingReason,
  selectPublishEnabled,
  selectSaveVersionBlockingReason,
  selectSaveVersionEnabled,
  selectUpdateBlockingReason,
  selectUpdateEnabled
} from "../../state/selectors/projectSelectors";

function ActionButton({
  label,
  enabled,
  title,
  onClick
}: {
  label: string;
  enabled: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button disabled={!enabled} onClick={onClick} title={title} style={{ padding: "10px 14px" }}>
      {label}
    </button>
  );
}

export function PrimaryActionCluster() {
  const { state, commands } = useProjectStateMachine();
  const { navigate } = useAppRouter();
  const projectPathBase = `/projects/${state.context.projectId}`;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <ActionButton
        label="Save version"
        enabled={selectSaveVersionEnabled(state)}
        title={selectSaveVersionBlockingReason(state)}
        onClick={async () => {
          const result = await commands.openSaveVersionModal();
          if (result.ok) {
            navigate(`${projectPathBase}/save-version`, { modal: true });
          }
        }}
      />
      <ActionButton
        label="Publish changes"
        enabled={selectPublishEnabled(state)}
        title={selectPublishBlockingReason(state)}
        onClick={() => navigate(`${projectPathBase}/publish`, { modal: true })}
      />
      <ActionButton
        label="Update project"
        enabled={selectUpdateEnabled(state)}
        title={selectUpdateBlockingReason(state)}
        onClick={async () => {
          await commands.startUpdateProject();
        }}
      />
    </div>
  );
}
