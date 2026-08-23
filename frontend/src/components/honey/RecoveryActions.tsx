import { ArrowClockwiseIcon, HeartbeatIcon, PowerIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { companionIsReady, restartCompanion, waitForCompanionReady } from "../../api/companion";
import { Button } from "../ui/Button";

type RecoveryPhase = "idle" | "checking" | "restarting" | "failed";

export function RecoveryActions({ showRestart = true, className = "" }: {
  showRestart?: boolean;
  className?: string;
}) {
  const [phase, setPhase] = useState<RecoveryPhase>("idle");
  const [message, setMessage] = useState("");
  const busy = phase === "checking" || phase === "restarting";

  async function reconnect() {
    setPhase("checking");
    setMessage("正在检查本机连接");
    if (await companionIsReady()) {
      setMessage("已经重新连上，正在恢复页面");
      window.location.reload();
      return;
    }
    setPhase("failed");
    setMessage("HoneyOS 暂时没有响应。后台守护程序会自动尝试恢复，也可以稍后再点一次。");
  }

  async function restart() {
    setPhase("restarting");
    setMessage("正在安全重启，聊天和记忆不会丢失");
    try {
      await restartCompanion();
      const ready = await waitForCompanionReady();
      if (!ready) throw new Error("restart_timeout");
      setMessage("已经恢复，正在重新打开页面");
      window.location.reload();
    } catch {
      setPhase("failed");
      setMessage("暂时无法从网页启动恢复。HoneyOS 会继续在后台自动重试，请等待十几秒后重新载入。");
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void reconnect()}>
          {phase === "checking" ? <HeartbeatIcon className="animate-pulse" size={18} /> : <ArrowClockwiseIcon size={18} />}
          {phase === "checking" ? "正在检查" : "重新连接"}
        </Button>
        {showRestart ? (
          <Button type="button" disabled={busy} onClick={() => void restart()}>
            <PowerIcon size={18} />
            {phase === "restarting" ? "正在重启" : "重启 HoneyOS"}
          </Button>
        ) : null}
      </div>
      {message ? <p className={`mt-3 text-xs leading-5 ${phase === "failed" ? "text-[var(--danger)]" : "text-[var(--foreground-muted)]"}`} role="status">{message}</p> : null}
    </div>
  );
}
