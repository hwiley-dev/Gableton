import type { PropsWithChildren } from "react";

export function ModalOverlay({ children }: PropsWithChildren) {
  return (
    <div className="modal-overlay">
      <div className="modal-panel">{children}</div>
    </div>
  );
}
