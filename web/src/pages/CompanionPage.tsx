import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Bell, Brain, Heart, MessageCircle, PackageCheck, Pencil } from "lucide-react";
import * as QRCode from "qrcode";
import { H2 } from "@nous-research/ui/ui/components/typography/h2";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Button } from "@nous-research/ui/ui/components/button";
import { Card, CardContent } from "@nous-research/ui/ui/components/card";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { Input } from "@nous-research/ui/ui/components/input";
import { Label } from "@nous-research/ui/ui/components/label";
import {
  api,
  type Companion,
  type CompanionCapability,
  type CompanionRuntime,
  type CompanionWeixinSession,
} from "@/lib/api";

type IdentityDraft = Pick<
  Companion,
  | "display_name"
  | "relationship_type"
  | "personality"
  | "communication_style"
  | "boundaries"
  | "advanced_system_prompt"
>;

export default function CompanionPage() {
  const { id = "" } = useParams();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [capabilities, setCapabilities] = useState<CompanionCapability[]>([]);
  const [installing, setInstalling] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [weixinSession, setWeixinSession] = useState<CompanionWeixinSession | null>(null);
  const [weixinQr, setWeixinQr] = useState("");
  const [startingWeixin, setStartingWeixin] = useState(false);
  const [runtime, setRuntime] = useState<CompanionRuntime | null>(null);
  const [restartingRuntime, setRestartingRuntime] = useState(false);
  const weixinQrContent = weixinSession?.qr_content;
  const weixinRequestId = weixinSession?.request_id;
  const weixinStatus = weixinSession?.status;

  const loadCapabilities = useCallback(
    () =>
      api
        .getCompanionCapabilities(id)
        .then(result => setCapabilities(result.capabilities)),
    [id],
  );
  const loadRuntime = useCallback(
    () => api.getCompanionRuntime(id).then(setRuntime),
    [id],
  );
  useEffect(() => {
    api
      .getCompanion(id)
      .then(setCompanion)
      .catch(reason =>
        setError(reason instanceof Error ? reason.message : "读取失败"),
      );
    void loadCapabilities();
  }, [id, loadCapabilities]);

  useEffect(() => {
    if (companion?.channel !== "weixin") return;
    void loadRuntime();
    const timer = window.setInterval(() => void loadRuntime(), 3000);
    return () => window.clearInterval(timer);
  }, [companion?.channel, loadRuntime]);

  useEffect(() => {
    if (!weixinQrContent) return;
    let active = true;
    QRCode.toDataURL(weixinQrContent, { width: 256, margin: 1 })
      .then(dataUrl => {
        if (active) setWeixinQr(dataUrl);
      })
      .catch(() => {
        if (active) setError("二维码生成失败，请重试");
      });
    return () => {
      active = false;
    };
  }, [weixinQrContent]);

  useEffect(() => {
    if (!weixinRequestId || !weixinStatus || !["waiting", "scanned"].includes(weixinStatus)) return;
    let active = true;
    let timer = 0;
    const poll = async () => {
      try {
        const result = await api.getCompanionWeixinStatus(id, weixinRequestId);
        if (!active) return;
        setWeixinSession(result);
        if (result.companion) setCompanion(result.companion);
        if (result.status === "confirmed") window.setTimeout(() => void loadRuntime(), 1000);
        if (result.status === "confirmed" && result.gateway_restart_error) {
          setError(`微信已连接，但启动消息服务失败：${result.gateway_restart_error}`);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "查询微信状态失败");
      } finally {
        if (active) timer = window.setTimeout(() => void poll(), 1500);
      }
    };
    timer = window.setTimeout(() => void poll(), 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id, loadRuntime, weixinRequestId, weixinStatus]);

  const connectWeixin = async () => {
    setStartingWeixin(true);
    setError("");
    try {
      setWeixinSession(await api.startCompanionWeixin(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法开始微信连接");
    } finally {
      setStartingWeixin(false);
    }
  };

  const cancelWeixin = async () => {
    if (weixinSession) {
      try {
        await api.cancelCompanionWeixin(id, weixinSession.request_id);
      } catch {
        // The server may already have expired the request; closing is still safe.
      }
    }
    setWeixinSession(null);
  };

  const restartRuntime = async () => {
    setRestartingRuntime(true);
    setError("");
    try {
      await api.restartCompanionRuntime(id);
      window.setTimeout(() => void loadRuntime(), 1500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法启动微信消息服务");
    } finally {
      setRestartingRuntime(false);
    }
  };

  const install = async (capability: CompanionCapability) => {
    setInstalling(capability.id);
    setError("");
    try {
      await api.installCompanionCapability(id, capability.id);
      await loadCapabilities();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "安装失败");
    } finally {
      setInstalling("");
    }
  };

  const beginEditing = () => {
    setDraft({
      display_name: companion?.display_name ?? "",
      relationship_type: companion?.relationship_type ?? "",
      personality: companion?.personality ?? "",
      communication_style: companion?.communication_style ?? "",
      boundaries: companion?.boundaries ?? "",
      advanced_system_prompt: companion?.advanced_system_prompt ?? "",
    });
    setEditing(true);
  };

  const saveIdentity = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateCompanionIdentity(id, draft);
      setCompanion(updated);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!companion && !error)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  if (!companion)
    return (
      <Card>
        <CardContent className="py-8 text-destructive">{error}</CardContent>
      </Card>
    );
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link
        to="/companions"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 返回我的伴侣
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-400/25 to-violet-500/20 text-2xl text-rose-300">
            {companion.display_name.slice(0, 1)}
          </div>
          <div>
            <H2>{companion.display_name}</H2>
            <p className="mt-1 text-sm text-muted-foreground">
              {companion.relationship_type} · 同一个 Profile 持续承接
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="outline">
            {runtime?.gateway_running
              ? "微信在线"
              : companion.channel === "weixin"
                ? "微信已连接 · 服务启动中"
                : companion.setup_status === "needs_channel"
              ? "等待连接微信"
              : companion.setup_status}
          </Badge>
          <Button size="sm" outlined onClick={beginEditing}>
            <Pencil className="mr-2 h-3.5 w-3.5" />编辑人格
          </Button>
        </div>
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {editing && draft && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="font-medium">编辑人格</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                保存后从下一段新对话生效；已有 USER、MEMORY 和聊天历史不会删除。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <IdentityField label="名字" value={draft.display_name} onChange={value => setDraft({ ...draft, display_name: value })} input />
              <IdentityField label="关系" value={draft.relationship_type} onChange={value => setDraft({ ...draft, relationship_type: value })} input />
            </div>
            <IdentityField label="性格与表达" value={draft.personality} onChange={value => setDraft({ ...draft, personality: value })} />
            <IdentityField label="沟通方式" value={draft.communication_style} onChange={value => setDraft({ ...draft, communication_style: value })} />
            <IdentityField label="相处边界" value={draft.boundaries} onChange={value => setDraft({ ...draft, boundaries: value })} />
            <IdentityField label="高级 System Notes" value={draft.advanced_system_prompt} onChange={value => setDraft({ ...draft, advanced_system_prompt: value })} />
            <div className="flex justify-end gap-2">
              <Button size="sm" ghost onClick={() => setEditing(false)}>取消</Button>
              <Button size="sm" disabled={saving || !draft.display_name.trim() || !draft.relationship_type.trim()} onClick={() => void saveIdentity()}>{saving ? "保存中…" : "保存"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={<Brain className="h-5 w-5" />}
          title="当前大脑"
          value={companion.model}
          detail={companion.provider}
        />
        <InfoCard
          icon={<Heart className="h-5 w-5" />}
          title="身份载体"
          value={companion.profile_name}
          detail="人格、记忆、Session 与能力彼此隔离"
        />
        <Card>
          <CardContent className="p-5">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="mt-4 font-medium">微信私聊</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {companion.channel === "weixin"
                ? runtime?.gateway_running
                  ? "伴侣已在线。现在去微信给 iLink Bot 发第一条消息。"
                  : "微信已连接，正在启动伴侣的消息服务。"
                : "连接 iLink Bot 后，它会成为日常联系人。"}
            </p>
            {companion.channel === "weixin" && !runtime?.gateway_running && (
              <Button className="mt-4" size="sm" disabled={restartingRuntime} onClick={() => void restartRuntime()}>
                {restartingRuntime ? "正在启动…" : "启动微信消息服务"}
              </Button>
            )}
            <Button className="mt-4" size="sm" disabled={startingWeixin} onClick={() => void connectWeixin()}>
              {startingWeixin ? "正在获取二维码…" : companion.channel === "weixin" ? "重新连接" : "扫码连接微信"}
            </Button>
          </CardContent>
        </Card>
      </div>
      {weixinSession && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div>
              <h3 className="font-medium">
                {weixinSession.status === "confirmed" ? "微信已连接" : "用微信扫码并在手机上确认"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {weixinSession.status === "scanned"
                  ? "已扫码，等待你在微信中确认…"
                  : weixinSession.status === "confirmed"
                    ? "已安全连接。你的微信已自动设为唯一 owner，现在去给 iLink Bot 发第一条消息。"
                    : weixinSession.status === "expired"
                      ? "二维码已过期，请关闭后重新连接。"
                      : "页面会自动等待扫码结果。"}
              </p>
            </div>
            {weixinSession.status !== "confirmed" && weixinSession.status !== "expired" && weixinQr && (
              <img src={weixinQr} alt="微信登录二维码" className="h-64 w-64 rounded-xl bg-white p-2" />
            )}
            <p className="max-w-xl text-xs text-muted-foreground">
              这里连接的是微信 iLink Bot 身份，主要支持私聊；普通微信群通常无法使用。扫码的微信账号会自动成为唯一 owner。
            </p>
            <Button size="sm" outlined onClick={() => void cancelWeixin()}>关闭</Button>
          </CardContent>
        </Card>
      )}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-medium">给它增加一种能力</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map(capability => (
            <Card
              key={capability.id}
              className={
                capability.status === "coming_soon" ? "opacity-65" : ""
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <PackageCheck className="h-5 w-5 text-violet-400" />
                  <Badge tone="outline">
                    {capability.installed
                      ? "已学会"
                      : capability.status === "available"
                        ? "可安装"
                        : "即将推出"}
                  </Badge>
                </div>
                <h4 className="mt-4 font-medium">{capability.name}</h4>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                  {capability.description}
                </p>
                {capability.permissions.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    权限：{capability.permissions.join("、")}
                  </p>
                )}
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  disabled={
                    capability.installed ||
                    capability.status !== "available" ||
                    installing === capability.id
                  }
                  onClick={() => void install(capability)}
                >
                  {installing === capability.id
                    ? "安装中…"
                    : capability.installed
                      ? "已安装"
                      : "让它学会"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-violet-400">{icon}</div>
        <h3 className="mt-4 font-medium">{title}</h3>
        <p className="mt-1 truncate text-sm">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function IdentityField({ label, value, onChange, input = false }: { label: string; value: string; onChange: (value: string) => void; input?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input ? (
        <Input value={value} onChange={event => onChange(event.target.value)} />
      ) : (
        <textarea className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" rows={3} value={value} onChange={event => onChange(event.target.value)} />
      )}
    </div>
  );
}
