import { useQuery } from "@tanstack/react-query";

import { fetchCompanionSettings } from "../../api/companion";
import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { useHoneyStore } from "../../runtime/honey-store";

export function SettingsPage() {
  const runtimeLoading = useHoneyStore((state) => state.loading);
  const runtimeError = useHoneyStore((state) => state.error);
  const summary = useHoneyStore((state) => state.summarySettings);
  const settings = useQuery({ queryKey: ["companion-settings"], queryFn: fetchCompanionSettings });

  if (runtimeLoading || settings.isLoading) return <PageFrame><LoadingState /></PageFrame>;
  if (runtimeError || settings.isError) return <PageFrame><ErrorState /></PageFrame>;

  return (
    <PageFrame>
      <PageHeader title="设置" description="第一阶段只读取当前配置，不会在新界面里修改 API Key 或连接渠道。" />
      <div className="mt-8 grid gap-3">
        <SettingRow label="对话模型" value={String(summary.conversation_model || "跟随当前配置")} />
        <SettingRow label="记忆整理模型" value={String(summary.distillation_model || "自动")} />
        <SettingRow label="记忆位置" value={summary.memory_location === "local" ? "只保存在本机" : String(summary.memory_location || "本机")} />
        <SettingRow label="配置读取" value={settings.data ? "已连接" : "暂不可用"} />
      </div>
    </PageFrame>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <span className="text-sm font-medium text-[var(--foreground-muted)]">{label}</span>
      <strong className="font-medium">{value}</strong>
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}
