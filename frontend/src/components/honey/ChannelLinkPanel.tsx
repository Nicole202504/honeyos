import { CheckCircleIcon, QrCodeIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  fetchCompanionChannelLink,
  startCompanionChannelLink,
  type CompanionChannelLink,
} from "../../api/companion";
import { Button } from "../ui/Button";

type Platform = "weixin" | "feishu";

const labels: Record<Platform, string> = { weixin: "微信", feishu: "飞书" };

export function ChannelLinkPanel({
  platform,
  configured,
  onConnected,
}: {
  platform: Platform;
  configured: boolean;
  onConnected?: (platform: Platform) => void;
}) {
  const start = useMutation({ mutationFn: () => startCompanionChannelLink(platform) });
  const link = useQuery({
    queryKey: ["companion-channel-link", start.data?.link_id],
    queryFn: () => fetchCompanionChannelLink(start.data!.link_id),
    enabled: Boolean(start.data?.link_id) && start.data?.status !== "connected",
    initialData: start.data,
    refetchInterval: (query) => {
      const status = (query.state.data as CompanionChannelLink | undefined)?.status;
      return status && ["connected", "expired", "denied", "error"].includes(status) ? false : 1800;
    },
  });
  const state = link.data || start.data;

  useEffect(() => {
    if (state?.status === "connected") onConnected?.(platform);
  }, [onConnected, platform, state?.status]);

  if (configured || state?.status === "connected") {
    return (
      <section className="rounded-[var(--radius-md)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2 text-[var(--success)]">
          <CheckCircleIcon size={20} weight="fill" />
          <strong>{labels[platform]}已连接</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">连接信息只保存在这台电脑上。</p>
      </section>
    );
  }

  if (state?.qr_image) {
    const message = state.status === "scanned" ? "已经扫码，请在手机上确认" : "使用手机扫码连接";
    return (
      <section className="rounded-[var(--radius-md)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <strong>{labels[platform]}</strong>
          <span className="text-xs text-[var(--foreground-muted)]" role="status">{message}</span>
        </div>
        <img
          src={state.qr_image}
          alt={`${labels[platform]}连接二维码`}
          className="mx-auto mt-4 aspect-square w-full max-w-52 rounded-[var(--radius-sm)] bg-white p-3"
        />
        {state.status === "expired" || state.status === "denied" || state.status === "error" ? (
          <Button className="mt-4 w-full" variant="secondary" onClick={() => start.mutate()}>重新生成二维码</Button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-md)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <strong className="block">{labels[platform]}</strong>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">扫码后可以在手机里继续聊天。</p>
        </div>
        <Button variant="secondary" disabled={start.isPending} onClick={() => start.mutate()}>
          <QrCodeIcon size={18} />{start.isPending ? "正在连接" : "连接"}
        </Button>
      </div>
      {start.isError ? <p className="mt-3 text-xs text-[var(--danger)]" role="alert">{start.error instanceof Error ? start.error.message : "暂时无法开始连接"}</p> : null}
    </section>
  );
}
