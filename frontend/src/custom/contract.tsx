import type { ComponentType, ReactNode } from "react";

export type HoneyOSAppFrameProps = {
  children: ReactNode;
  pathname: string;
};

export type HoneyOSMessageFrameProps = {
  children: ReactNode;
  role: "user" | "assistant" | "system";
  messageId?: string;
  isStreaming: boolean;
};

export type HoneyOSCustomizationManifest = {
  version: 1;
  id: string;
  productName: string;
  slots: {
    AppFrame?: ComponentType<HoneyOSAppFrameProps>;
    MessageFrame?: ComponentType<HoneyOSMessageFrameProps>;
  };
};

export function defineHoneyOSCustomization(
  manifest: HoneyOSCustomizationManifest,
): HoneyOSCustomizationManifest {
  return manifest;
}
