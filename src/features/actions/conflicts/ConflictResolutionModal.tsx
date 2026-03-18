import { SectionCard } from "../../shared/SectionCard";

export function ConflictResolutionModal() {
  return (
    <SectionCard title="Conflict requires attention">
      <p>Overlap summary and manual resolution guidance appear here.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button>Dismiss</button>
        <button>Open in Ableton</button>
      </div>
    </SectionCard>
  );
}
