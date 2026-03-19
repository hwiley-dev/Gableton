import { useAppRouter } from "../../../app/router";
import { SectionCard } from "../../shared/SectionCard";

export function ConflictResolutionModal() {
  const { closeModal } = useAppRouter();

  return (
    <SectionCard title="Conflict requires attention">
      <p>Overlap summary and manual resolution guidance appear here.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={closeModal}>Dismiss</button>
        <button onClick={closeModal}>Open in Ableton</button>
      </div>
    </SectionCard>
  );
}
