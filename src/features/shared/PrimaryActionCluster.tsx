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

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <ActionButton
        label="Save version"
        enabled={selectSaveVersionEnabled(state)}
        title={selectSaveVersionBlockingReason(state)}
        onClick={commands.openSaveVersionModal}
      />
      <ActionButton
        label="Publish changes"
        enabled={selectPublishEnabled(state)}
        title={selectPublishBlockingReason(state)}
        onClick={() =>
          commands.startPublish({
            targetLine: state.context.activeLine,
            title: "Draft publish from scaffold"
          })
        }
      />
      <ActionButton
        label="Update project"
        enabled={selectUpdateEnabled(state)}
        title={selectUpdateBlockingReason(state)}
        onClick={commands.startUpdateProject}
      />
    </div>
  );
}
