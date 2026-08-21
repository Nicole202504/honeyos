import { cn } from "../../lib/utils";

type HoneyAvatarProps = {
  name: string;
  className?: string;
};

export function HoneyAvatar({ name, className }: HoneyAvatarProps) {
  const initial = Array.from(name.trim())[0] || "H";
  return (
    <span
      className={cn(
        "inline-grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] shadow-[0_10px_30px_rgba(34,36,44,0.14)]",
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
