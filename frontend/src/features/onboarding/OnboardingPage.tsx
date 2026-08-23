import { ArrowRightIcon, CheckIcon, KeyIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  restartCompanion,
  discoverCompanionModels,
  fetchCompanionSettings,
  saveCompanionModel,
} from "../../api/companion";
import { apiPath } from "../../api/client";
import { ChannelLinkPanel } from "../../components/honey/ChannelLinkPanel";
import { Button } from "../../components/ui/Button";

const providers = [
  { value: "openai-api", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { value: "custom", label: "其他兼容接口", baseUrl: "" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["companion-settings"], queryFn: fetchCompanionSettings });
  const [stage, setStage] = useState<"model" | "channels" | "ready">("model");
  const [provider, setProvider] = useState("openai-api");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");

  useEffect(() => {
    const current = settings.data?.settings.model;
    if (!current) return;
    if (current.provider) setProvider(current.provider);
    if (current.base_url) setBaseUrl(current.base_url);
    if (current.model) setModel(current.model);
    if (current.model && current.api_key_configured) setStage("channels");
  }, [settings.data]);

  const discover = useMutation({
    mutationFn: discoverCompanionModels,
    onSuccess: (data) => {
      setModels(data.models || []);
      if (!model && data.models?.[0]) setModel(data.models[0]);
      setStatus(data.models.length ? `已经找到 ${data.models.length} 个可用模型` : "接口已连接，请填写模型 ID");
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "暂时没有连接成功"),
  });
  const save = useMutation({
    mutationFn: saveCompanionModel,
    onSuccess: (data) => {
      queryClient.setQueryData(["companion-settings"], { settings: data.settings });
      setApiKey("");
      setStage("channels");
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "刚才没有保存成功"),
  });

  function chooseProvider(next: string) {
    setProvider(next);
    const option = providers.find((item) => item.value === next);
    setBaseUrl(next === "custom" ? "" : option?.baseUrl || "");
    setModel("");
    setModels([]);
    setStatus("");
  }

  function connect() {
    setStatus("正在连接模型服务");
    discover.mutate({ provider, base_url: baseUrl, api_key: apiKey });
  }

  function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey && !settings.data?.settings.model.api_key_configured) {
      setStatus("请先填写 API Key");
      return;
    }
    if (!model.trim()) {
      setStatus("请先选择或填写模型 ID");
      return;
    }
    setStatus("正在验证模型是否可以正常聊天和使用工具");
    save.mutate({ provider, base_url: baseUrl, model: model.trim(), ...(apiKey ? { api_key: apiKey } : {}) });
  }

  const activeIndex = stage === "model" ? 0 : stage === "channels" ? 1 : 2;

  async function startChat() {
    if (!connected.size) {
      navigate("/", { replace: true });
      return;
    }
    setFinishing(true);
    setFinishError("");
    try {
      await restartCompanion();
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
      for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
          const response = await fetch(apiPath("/health"), { cache: "no-store" });
          if (response.ok) {
            window.location.assign(apiPath("/"));
            return;
          }
        } catch {
          // Expected while the local background service is restarting.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      throw new Error("HoneyOS 重启时间比预期更久，请刷新页面重试");
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "暂时无法完成设置");
      setFinishing(false);
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[var(--background)] px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <strong className="text-sm tracking-[-0.02em]">HoneyOS</strong>
          <span className="text-xs text-[var(--foreground-muted)]">所有信息只保存在本机</span>
        </header>
        <div className="mt-7 grid grid-cols-3 gap-2" aria-label={`首次设置进度 ${activeIndex + 1}/3`}>
          {[0, 1, 2].map((item) => <span key={item} className={`h-1.5 rounded-full ${item <= activeIndex ? "bg-[var(--foreground)]" : "bg-[var(--surface-subtle)]"}`} />)}
        </div>

        {stage === "model" ? (
          <section className="py-12 sm:py-16">
            <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">先让它能够回应你</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--foreground-muted)] sm:text-base">选择模型服务并填写 API Key。密钥不会显示，也不会离开这台电脑。</p>
            <form onSubmit={submitModel} className="mt-9 grid gap-5 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-5 shadow-[0_18px_60px_rgba(32,33,40,0.08)] sm:p-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="模型服务"><select value={provider} onChange={(event) => chooseProvider(event.target.value)} className="honey-setting-control">{providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="API Key" hint="输入内容不会显示"><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="new-password" placeholder="粘贴 API Key" className="honey-setting-control" /></Field>
              </div>
              {provider === "custom" ? <Field label="接口地址"><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} type="url" inputMode="url" placeholder="https://api.example.com/v1" className="honey-setting-control" /></Field> : null}
              <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" disabled={discover.isPending || !apiKey} onClick={connect}><KeyIcon size={18} />连接并读取模型</Button><span className="text-xs leading-5 text-[var(--foreground-muted)]" role="status">{status}</span></div>
              {models.length ? <Field label="选择模型"><select value={models.includes(model) ? model : ""} onChange={(event) => setModel(event.target.value)} className="honey-setting-control"><option value="">请选择模型</option>{models.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field> : null}
              <Field label="模型 ID" hint="列表里没有时可以直接填写"><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 provider/model-name" className="honey-setting-control" /></Field>
              <Button type="submit" className="w-full sm:w-fit" disabled={save.isPending}>{save.isPending ? "正在验证" : "保存并继续"}<ArrowRightIcon size={18} /></Button>
            </form>
          </section>
        ) : null}

        {stage === "channels" ? (
          <section className="py-12 sm:py-16">
            <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">想在哪里和它说话？</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--foreground-muted)] sm:text-base">网页已经可以使用。微信和飞书都可以以后再连接。</p>
            <div className="mt-9 grid gap-4">
              <section className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-4 ring-1 ring-[var(--accent)]">
                <div className="flex items-center gap-2 text-[var(--accent)]"><CheckIcon size={18} weight="bold" /><strong>本地网页</strong></div>
                <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">安装完成后会自动打开，也是默认聊天入口。</p>
              </section>
              <div className="grid gap-4 sm:grid-cols-2">
                <ChannelLinkPanel platform="weixin" configured={Boolean(settings.data?.settings.channels.weixin.configured)} onConnected={(value) => setConnected((items) => new Set(items).add(value))} />
                <ChannelLinkPanel platform="feishu" configured={Boolean(settings.data?.settings.channels.feishu.configured)} onConnected={(value) => setConnected((items) => new Set(items).add(value))} />
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3"><Button onClick={() => setStage("ready")}>继续<ArrowRightIcon size={18} /></Button><button type="button" className="min-h-11 px-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]" onClick={() => setStage("ready")}>暂时只用网页</button></div>
          </section>
        ) : null}

        {stage === "ready" ? (
          <section className="flex min-h-[70dvh] flex-col justify-center py-12">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--surface-raised)] text-[var(--success)]"><CheckIcon size={24} weight="bold" /></span>
            <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">好了，它在等你</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--foreground-muted)] sm:text-base">默认使用自然陪伴模式。你不需要先写完整人设，名字、性格和你们的相处方式都可以慢慢形成。</p>
            {connected.size ? <p className="mt-3 text-xs text-[var(--foreground-muted)]">开始聊天前会自动重启一次，让新连接的渠道立即生效。</p> : null}
            {finishError ? <p className="mt-4 text-sm text-[var(--danger)]" role="alert">{finishError}</p> : null}
            <Button className="mt-8 w-full sm:w-fit" disabled={finishing} onClick={() => void startChat()}>{finishing ? "正在重新连接" : "开始聊天"}<ArrowRightIcon size={18} /></Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold">{label}</span>{hint ? <small className="text-xs leading-5 text-[var(--foreground-muted)]">{hint}</small> : null}{children}</label>;
}
