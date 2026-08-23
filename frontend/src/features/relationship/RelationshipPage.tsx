import { CheckIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

import { updateCompanionProfile, type CompanionProfileDetails } from "../../api/companion";
import { HoneyAvatar } from "../../components/honey/HoneyAvatar";
import { HoneyAvatarEditor } from "../../components/honey/HoneyAvatarEditor";
import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { Button } from "../../components/ui/Button";
import { useHoneyStore } from "../../runtime/honey-store";

const emptyProfile: Required<CompanionProfileDetails> = {
  companion_name: "",
  personality: "",
  speaking_style: "",
  user_nickname: "",
  relationship: "",
  boundaries: "",
};

function normalizedProfile(profile: CompanionProfileDetails): Required<CompanionProfileDetails> {
  return {
    companion_name: profile.companion_name || "",
    personality: profile.personality || "",
    speaking_style: profile.speaking_style || "",
    user_nickname: profile.user_nickname || "",
    relationship: profile.relationship || "",
    boundaries: profile.boundaries || "",
  };
}

const fields = [
  { label: "它的名字", key: "companion_name", placeholder: "例如：小树", rows: 1 },
  { label: "它的性格", key: "personality", placeholder: "例如：温柔，但不会一味顺从", rows: 3 },
  { label: "说话方式", key: "speaking_style", placeholder: "例如：自然、直接、不说教", rows: 3 },
  { label: "它怎么称呼你", key: "user_nickname", placeholder: "由你明确决定", rows: 1 },
  { label: "你们的关系", key: "relationship", placeholder: "只有明确确认后才填写", rows: 2 },
  { label: "长期边界", key: "boundaries", placeholder: "例如：工作时间不要主动联系", rows: 3 },
] as const;

export function RelationshipPage() {
  const { loading, error, name, profile, updateProfile } = useHoneyStore();
  const [draft, setDraft] = useState<Required<CompanionProfileDetails>>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: updateCompanionProfile,
    onSuccess: (data) => {
      updateProfile(data.profile);
      setDraft(normalizedProfile(data.profile));
      setSaved(true);
    },
  });

  useEffect(() => setDraft(normalizedProfile(profile)), [profile]);

  if (loading) return <PageFrame><LoadingState /></PageFrame>;
  if (error) return <PageFrame><ErrorState /></PageFrame>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    mutation.mutate(draft);
  }

  return (
    <PageFrame>
      <PageHeader title="我们" description="双方明确确认过的资料，才会留在这里。" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-9">
          <section className="flex min-h-60 flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--foreground)] p-6 text-[var(--background)]">
            <HoneyAvatar name={name} className="size-16 rounded-full bg-[var(--background)] text-xl text-[var(--foreground)]" />
            <div>
              <strong className="text-2xl tracking-[-0.025em]">{name}</strong>
              <p className="mt-2 text-sm opacity-70">{profile.relationship || "正在认识彼此"}</p>
              <p className="mt-1 text-xs opacity-55">
                {profile.user_nickname ? `它会叫你“${profile.user_nickname}”` : "称呼可以由你决定"}
              </p>
            </div>
          </section>

          <div className="mt-5 divide-y divide-[var(--border)]">
            <HoneyAvatarEditor
              surface="companion"
              name={name}
              label="它的头像"
              description="只保存在这台电脑的浏览器里"
            />
            <HoneyAvatarEditor
              surface="user"
              name="你"
              label="你的头像"
              description="不会上传到模型服务"
            />
          </div>
        </aside>

        <form onSubmit={submit} className="min-w-0">
          <div className="grid gap-6">
            {fields.map((field) => (
              <label key={field.key} className="grid gap-2">
                <span className="text-sm font-semibold">{field.label}</span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {field.key === "companion_name" ? "会同步显示在聊天和侧边栏" : "留空表示还没有明确填写"}
                </span>
                {field.rows === 1 ? (
                  <input
                    value={draft[field.key]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="min-h-12 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 outline-none placeholder:text-[var(--foreground-faint)] focus:ring-2 focus:ring-[var(--focus)]"
                  />
                ) : (
                  <textarea
                    value={draft[field.key]}
                    onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    rows={field.rows}
                    className="resize-y rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-3 leading-7 outline-none placeholder:text-[var(--foreground-faint)] focus:ring-2 focus:ring-[var(--focus)]"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-8 flex min-h-12 flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
            <Button type="submit" disabled={mutation.isPending}>保存资料</Button>
            {mutation.isPending ? <span className="text-sm text-[var(--foreground-muted)]">正在保存</span> : null}
            {saved ? <span className="flex items-center gap-1.5 text-sm text-[var(--success)]"><CheckIcon size={17} />已经保存</span> : null}
            {mutation.isError ? <span className="text-sm text-[var(--danger)]">刚才没有保存，请再试一次</span> : null}
          </div>
        </form>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}
