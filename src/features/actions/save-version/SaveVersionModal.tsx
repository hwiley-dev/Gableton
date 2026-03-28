import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import {
  selectEnvironmentSummary,
  selectSaveVersionBlockingReason,
  selectSaveVersionEnabled,
  selectWorkspaceSummary
} from "../../../state/selectors/projectSelectors";
import { SectionCard } from "../../shared/SectionCard";

export function SaveVersionModal() {
  const { state, commands } = useProjectStateMachine();
  const { closeModal } = useAppRouter();
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (state.localVersion === "dirty" && selectSaveVersionEnabled(state)) {
      void commands.openSaveVersionModal();
    }
  }, [commands, state]);

  const blockingReason =
    state.localVersion === "save_modal_open" ? undefined : selectSaveVersionBlockingReason(state);
  const workspaceSummary = selectWorkspaceSummary(state);
  const environmentSummary = selectEnvironmentSummary(state);

  if (blockingReason && state.localVersion !== "save_modal_open") {
    return (
      <SectionCard title="Save version">
        <p>{blockingReason}</p>
        <div className="button-row">
          <button onClick={closeModal}>Close</button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Save version">
      <label className="field-grid">
        <span>Message</span>
        <input value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <label className="field-grid">
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
      </label>
      <div>
        <strong>Summary</strong>
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Warnings</strong>
        <ul>
          {environmentSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="button-row">
        <button
          onClick={() => {
            commands.cancelSaveVersionModal();
            closeModal();
          }}
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            const result = await commands.confirmSaveVersion({ message, notes });
            if (!result.ok) {
              setError(result.reason);
              return;
            }
            closeModal();
          }}
        >
          Save version
        </button>
      </div>
    </SectionCard>
  );
}
