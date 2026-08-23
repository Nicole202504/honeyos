import { ImageIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  deleteCompanionAvatar,
  getCompanionAvatarStatus,
  updateCompanionAvatar,
} from "../../api/companion";
import { Button } from "../ui/Button";
import { HoneyAvatar } from "./HoneyAvatar";
import {
  getHoneyAvatarImage,
  notifyHoneyAvatarChanged,
  readHoneyAvatarFile,
  setHoneyAvatarImage,
  type HoneyAvatarSurface,
} from "./avatar-storage";

export function HoneyAvatarEditor({
  surface,
  name,
  label,
  description,
}: {
  surface: HoneyAvatarSurface;
  name: string;
  label: string;
  description: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hasImage, setHasImage] = useState(() => Boolean(getHoneyAvatarImage(surface)));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (surface !== "companion") return;
    let active = true;
    void getCompanionAvatarStatus().then((result) => {
      if (active) setHasImage(result.exists || Boolean(getHoneyAvatarImage(surface)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [surface]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus("正在处理图片");
    setSaving(true);
    try {
      const dataUrl = await readHoneyAvatarFile(file, surface === "companion"
        ? { maximumEdge: 2048, maximumBytes: 2.75 * 1024 * 1024, minimumEdge: 900 }
        : { maximumEdge: 1024, maximumBytes: 1.5 * 1024 * 1024, minimumEdge: 256 });
      if (surface === "companion") {
        const result = await updateCompanionAvatar(dataUrl);
        setHoneyAvatarImage(surface, "");
        notifyHoneyAvatarChanged(surface, result.version);
      } else {
        setHoneyAvatarImage(surface, dataUrl);
      }
      setHasImage(true);
      setStatus("已经换好了");
    } catch (error) {
      setStatus(error instanceof Error && error.message === "avatar_file_too_small"
        ? surface === "companion"
          ? "这张图片太小，放到左侧会模糊，请选择更清晰的图片"
          : "这张图片太小，请选择更清晰的图片"
        : "这张图片没有读出来，请换一张");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      if (surface === "companion") await deleteCompanionAvatar();
      setHoneyAvatarImage(surface, "");
      notifyHoneyAvatarChanged(surface);
      setHasImage(false);
      setStatus("已恢复为名字头像");
    } catch {
      setStatus("刚才没有移除成功，请再试一次");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex items-center gap-4 py-4">
      <HoneyAvatar name={name} surface={surface} className="size-16 rounded-full text-lg" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{label}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--foreground-muted)]">{description}</p>
        {status ? <p className="mt-1 text-xs text-[var(--foreground-faint)]" role="status">{status}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={choose} />
        <Button type="button" variant="secondary" disabled={saving} onClick={() => inputRef.current?.click()}>
          <ImageIcon size={17} />选择图片
        </Button>
        {hasImage ? (
          <Button type="button" variant="ghost" disabled={saving} aria-label={`移除${label}`} onClick={() => void remove()}>
            <TrashIcon size={17} />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
