export function ProjectContextPanel() {
  return (
    <div className="context-panel">
      <div className="context-panel__block">
        <div className="context-panel__label">Console Context</div>
        <h2 style={{ marginBottom: 8 }}>Inspect Signals</h2>
        <p className="muted-text">
          Select a warning, version, or change request to inspect its details here.
        </p>
      </div>
      <div className="context-panel__block">
        <div className="context-panel__label">Next Surface</div>
        <p className="muted-text">
          This panel will evolve into a focused inspector for versions, diagnostics, and review
          notes.
        </p>
      </div>
    </div>
  );
}
