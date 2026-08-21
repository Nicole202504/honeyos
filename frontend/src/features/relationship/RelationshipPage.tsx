import { HoneyAvatar } from "../../components/honey/HoneyAvatar";
import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { useHoneyStore } from "../../runtime/honey-store";

const fields = [
  ["它的性格", "personality"],
  ["说话方式", "speaking_style"],
  ["它怎么称呼你", "user_nickname"],
  ["你们的关系", "relationship"],
  ["长期边界", "boundaries"],
] as const;

export function RelationshipPage() {
  const { loading, error, name, profile } = useHoneyStore();
  if (loading) return <PageFrame><LoadingState /></PageFrame>;
  if (error) return <PageFrame><ErrorState /></PageFrame>;

  return (
    <PageFrame>
      <PageHeader title="我们" description="双方明确确认过的资料，才会留在这里。" />
      <div className="mt-9 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="flex min-h-56 flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--foreground)] p-6 text-[var(--background)]">
          <HoneyAvatar name={name} className="size-16 bg-[var(--background)] text-xl text-[var(--foreground)]" />
          <div>
            <strong className="text-2xl tracking-[-0.025em]">{name}</strong>
            <p className="mt-2 text-sm opacity-70">正在认识彼此</p>
          </div>
        </section>
        <dl className="grid gap-3">
          {fields.map(([label, key]) => (
            <div key={key} className="grid gap-2 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 sm:grid-cols-[150px_minmax(0,1fr)]">
              <dt className="text-sm font-medium text-[var(--foreground-muted)]">{label}</dt>
              <dd className="m-0 whitespace-pre-wrap text-[15px] leading-7">{profile[key] || "还没有明确填写"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}
