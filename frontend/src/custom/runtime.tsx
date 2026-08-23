import {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { honeyOSCustomization } from "./manifest";
import type { HoneyOSMessageFrameProps } from "./contract";

export const HONEYOS_SAFE_UI_QUERY = "honeyos-safe-ui";
export const HONEYOS_SAFE_UI_STORAGE_KEY = "honeyos-safe-ui";

const SafeModeContext = createContext(false);

export function isHoneyOSCustomUISafeMode(search: string): boolean {
  const queryStart = search.indexOf("?");
  const query = queryStart >= 0 ? search.slice(queryStart + 1) : search;
  const normalized = query.split("#", 1)[0];
  return new URLSearchParams(normalized).get(HONEYOS_SAFE_UI_QUERY) === "1";
}

class CustomizationBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; slotName: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[HoneyOS custom UI] ${this.props.slotName} failed; using the product UI`,
      error,
      info,
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function readBrowserSafeMode(): boolean {
  if (typeof window === "undefined") return false;
  const value = new URLSearchParams(window.location.search).get(HONEYOS_SAFE_UI_QUERY);
  if (value === "1") sessionStorage.setItem(HONEYOS_SAFE_UI_STORAGE_KEY, "1");
  if (value === "0") sessionStorage.removeItem(HONEYOS_SAFE_UI_STORAGE_KEY);
  return value === "1" || sessionStorage.getItem(HONEYOS_SAFE_UI_STORAGE_KEY) === "1";
}

export function HoneyOSCustomUIRoot({
  children,
  pathname,
}: PropsWithChildren<{ pathname: string }>) {
  const [safeMode, setSafeMode] = useState(readBrowserSafeMode);

  useEffect(() => {
    setSafeMode(readBrowserSafeMode());
  }, [pathname]);

  const AppFrame = honeyOSCustomization.slots.AppFrame;
  const content = safeMode || !AppFrame ? children : (
    <CustomizationBoundary fallback={children} slotName="AppFrame">
      <AppFrame pathname={pathname}>{children}</AppFrame>
    </CustomizationBoundary>
  );

  return <SafeModeContext.Provider value={safeMode}>{content}</SafeModeContext.Provider>;
}

export function HoneyOSMessageFrame({
  children,
  role,
  messageId,
  isStreaming,
}: HoneyOSMessageFrameProps) {
  const safeMode = useContext(SafeModeContext);
  const MessageFrame = honeyOSCustomization.slots.MessageFrame;
  if (safeMode || !MessageFrame) return children;
  return (
    <CustomizationBoundary fallback={children} slotName="MessageFrame">
      <MessageFrame role={role} messageId={messageId} isStreaming={isStreaming}>
        {children}
      </MessageFrame>
    </CustomizationBoundary>
  );
}
