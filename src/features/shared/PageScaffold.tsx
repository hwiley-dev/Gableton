import type { PropsWithChildren, ReactNode } from "react";

interface PageScaffoldProps extends PropsWithChildren {
  title: string;
  actions?: ReactNode;
}

export function PageScaffold({ title, actions, children }: PageScaffoldProps) {
  return (
    <div className="page-scaffold">
      <header className="page-scaffold__header">
        <h1 className="page-scaffold__title">{title}</h1>
        {actions}
      </header>
      <div className="page-scaffold__body">{children}</div>
    </div>
  );
}
