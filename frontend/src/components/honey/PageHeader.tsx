import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--foreground-muted)] sm:text-base">{description}</p>
      </div>
      {action}
    </header>
  );
}
