export type HoneyAvatarSurface = "companion" | "user";

const keys: Record<HoneyAvatarSurface, string> = {
  companion: "honeyos-avatar-companion",
  user: "honeyos-avatar-user",
};

export const HONEYOS_AVATAR_EVENT = "honeyos-avatar-changed";

export function notifyHoneyAvatarChanged(surface: HoneyAvatarSurface, version?: string): void {
  window.dispatchEvent(new CustomEvent(HONEYOS_AVATAR_EVENT, { detail: { surface, version } }));
}

export function getHoneyAvatarImage(surface: HoneyAvatarSurface): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(keys[surface]) || "";
  } catch {
    return "";
  }
}

export function setHoneyAvatarImage(surface: HoneyAvatarSurface, dataUrl: string): void {
  try {
    if (dataUrl) window.localStorage.setItem(keys[surface], dataUrl);
    else window.localStorage.removeItem(keys[surface]);
    notifyHoneyAvatarChanged(surface);
  } catch {
    throw new Error("avatar_storage_unavailable");
  }
}

type HoneyAvatarReadOptions = {
  maximumEdge?: number;
  maximumBytes?: number;
  minimumEdge?: number;
};

function estimatedDataUrlBytes(dataUrl: string): number {
  const payload = dataUrl.split(",", 2)[1] || "";
  return Math.ceil(payload.length * 0.75);
}

export function readHoneyAvatarFile(
  file: File,
  options: HoneyAvatarReadOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("avatar_file_invalid"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("avatar_file_unreadable"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("avatar_file_unreadable"));
      image.onload = () => {
        const maximumEdge = options.maximumEdge || 2048;
        const maximumBytes = options.maximumBytes || 2.75 * 1024 * 1024;
        const minimumEdge = Math.max(1, options.minimumEdge || 1);
        if (Math.min(image.width, image.height) < minimumEdge) {
          reject(new Error("avatar_file_too_small"));
          return;
        }
        const edgeCandidates = [maximumEdge, 1800, 1600, 1400, 1200]
          .filter((edge, index, values) => edge <= maximumEdge && values.indexOf(edge) === index);
        const qualities = [0.92, 0.86, 0.8, 0.72];

        for (const edge of edgeCandidates) {
          const scale = Math.min(1, edge / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("avatar_file_unreadable"));
            return;
          }
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          for (const quality of qualities) {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            if (estimatedDataUrlBytes(dataUrl) <= maximumBytes) {
              resolve(dataUrl);
              return;
            }
          }
        }
        reject(new Error("avatar_file_too_large"));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}
