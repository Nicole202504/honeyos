import { CheckIcon, KeyIcon, LinkIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  discoverCompanionModels,
  fetchCompanionSettings,
  saveCompanionModel,
} from "../../api/companion";
import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { ChannelLinkPanel } from "../../components/honey/ChannelLinkPanel";
import { Button } from "../../components/ui/Button";
import { applyHoneyTheme, readHoneyTheme, type HoneyTheme } from "../../design-system/theme";
import { useHoneyStore } from "../../runtime/honey-store";

const providers = [
  { value: "openai-api", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { value: "custom", label: "其他兼容接口", baseUrl: "" },
];

export function SettingsPage() {
  const runtimeLoading = useHoneyStore((state) => state.loading);
  const runtimeError = useHoneyStore((state) => state.error);
  const summary = useHoneyStore((state) => state.summarySettings);
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["companion-settings"], queryFn: fetchCompanionSettings });
  const [theme, setTheme] = useState<HoneyTheme>(readHoneyTheme);
  const [provider, setProvider] = useState("custom");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const value = settings.data?.settings.model;
    if (!value) return;
    setProvider(value.provider || "custom");
    setBaseUrl(value.base_url || "");
    setModel(value.model || "");
  }, [settings.data]);

  const discover = useMutation({
    mutationFn: discoverCompanionModels,
    onSuccess: (data) => {
      setModels(data.models || []);
      if (!model && data.models?.[0]) setModel(data.models[0]);
      setStatus(data.models.length ? `已经找到 ${data.models.length} 个模型` : "接口已连接，可以手动填写模型 ID");
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "暂时没有连接成功"),
  });
  const save = useMutation({
    mutationFn: saveCompanionModel,
    onSuccess: (data) => {
      queryClient.setQueryData(["companion-settings"], { settings: data.settings });
      setApiKey("");
      setStatus("模型配置已保存，下一句话会使用新模型");
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "刚才没有保存成功"),
  });

  if (runtimeLoading || settings.isLoading) return <PageFrame><LoadingState /></PageFrame>;
  if (runtimeError || settings.isError || !settings.data) return <PageFrame><ErrorState /></PageFrame>;

  const editable = settings.data.settings;

  function chooseProvider(next: string) {
    setProvider(next);
    const option = providers.find((item) => item.value === next);
    if (next !== "custom") setBaseUrl(option?.baseUrl || "");
    setModels([]);
    setStatus("");
  }

  function discoverModels() {
    setStatus("正在读取可用模型");
    discover.mutate({ provider, base_url: baseUrl, ...(apiKey ? { api_key: apiKey } : {}) });
  }

  function saveModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model.trim()) {
      setStatus("请先选择或填写模型 ID");
      return;
    }
    setStatus("正在保存模型配置");
    save.mutate({ provider, base_url: baseUrl, model: model.trim(), ...(apiKey ? { api_key: apiKey } : {}) });
  }

  return (
    <PageFrame>
      <PageHeader title="设置" description="模型密钥和聊天渠道凭据只保存在本机。" />

      <div className="mt-8 grid gap-10">
        <section>
          <h2 className="text-lg font-semibold">外观</h2>
          <label className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <span>
              <strong className="block text-sm">显示模式</strong>
              <small className="mt-1 block text-xs leading-5 text-[var(--foreground-muted)]">跟随系统，或固定使用浅色、深色。</small>
            </span>
            <select
              value={theme}
              onChange={(event) => {
                const next = event.target.value as HoneyTheme;
                setTheme(next);
                applyHoneyTheme(next);
              }}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 outline-none focus:ring-2 focus:ring-[var(--focus)]"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
        </section>

        <section className="border-t border-[var(--border)] pt-8">
          <h2 className="text-lg font-semibold">模型</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--foreground-muted)]">选择它思考和说话时使用的模型。已有密钥不会显示，也不需要重复填写。</p>
          <form onSubmit={saveModel} className="mt-5 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="模型服务">
                <select value={provider} onChange={(event) => chooseProvider(event.target.value)} className="honey-setting-control">
                  {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="API Key" hint={editable.model.api_key_configured ? "本机已经保存过密钥，留空表示继续使用" : "输入时不会显示"}>
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="new-password" placeholder={editable.model.api_key_configured ? "已经配置" : "粘贴 API Key"} className="honey-setting-control" />
              </Field>
            </div>
            {provider === "custom" ? (
              <Field label="接口地址">
                <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} type="url" inputMode="url" placeholder="https://api.example.com/v1" className="honey-setting-control" />
              </Field>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <Button type="button" variant="secondary" disabled={discover.isPending} onClick={discoverModels}>
                <LinkIcon size={17} />连接并读取模型
              </Button>
              <span className="text-xs leading-5 text-[var(--foreground-muted)]" role="status">{status || "连接后可以直接选择模型"}</span>
            </div>
            {models.length ? (
              <Field label="选择模型">
                <select value={models.includes(model) ? model : ""} onChange={(event) => setModel(event.target.value)} className="honey-setting-control">
                  <option value="">请选择模型</option>
                  {models.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="模型 ID" hint="列表里没有时可以直接填写">
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 provider/model-name" className="honey-setting-control" />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={save.isPending}><KeyIcon size={17} />保存模型配置</Button>
              {editable.model.model ? <span className="flex items-center gap-1.5 text-xs text-[var(--success)]"><CheckIcon size={16} />当前模型：{editable.model.model}</span> : null}
            </div>
          </form>
        </section>

        <section className="border-t border-[var(--border)] pt-8">
          <h2 className="text-lg font-semibold">聊天渠道</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--foreground-muted)]">网页始终可以使用。也可以直接在这里扫码连接微信或飞书，不需要回到终端。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ChannelLinkPanel platform="weixin" configured={editable.channels.weixin.configured} onConnected={() => void settings.refetch()} />
            <ChannelLinkPanel platform="feishu" configured={editable.channels.feishu.configured} onConnected={() => void settings.refetch()} />
          </div>
        </section>

        <section className="border-t border-[var(--border)] pt-8">
          <h2 className="text-lg font-semibold">隐私与记忆</h2>
          <Link to="/memories" className="mt-4 flex min-h-16 items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface)] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
            <span><strong className="block text-sm">记忆保存在本地</strong><small className="mt-1 block text-xs text-[var(--foreground-muted)]">当前使用本机数据库和记忆文件</small></span>
            <span className="text-sm text-[var(--accent)]">查看</span>
          </Link>
          <p className="mt-4 text-xs text-[var(--foreground-faint)]">对话模型：{summary.conversation_model || "跟随当前配置"}。记忆整理模型：{summary.distillation_model || "自动"}。</p>
        </section>
      </div>
    </PageFrame>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold">{label}</span>{hint ? <small className="text-xs leading-5 text-[var(--foreground-muted)]">{hint}</small> : null}{children}</label>;
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}
