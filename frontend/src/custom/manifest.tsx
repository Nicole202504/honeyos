import {
  defineHoneyOSCustomization,
  type HoneyOSAppFrameProps,
  type HoneyOSMessageFrameProps,
} from "./contract";

/**
 * User-owned UI layer.
 *
 * HoneyOS and AI customization tools should edit files under `src/custom/`
 * before touching the product UI or runtime implementation.
 */
function AppFrame({ children }: HoneyOSAppFrameProps) {
  return <div data-honeyos-custom-app="true">{children}</div>;
}

function MessageFrame({
  children,
  role,
  messageId,
  isStreaming,
}: HoneyOSMessageFrameProps) {
  return (
    <div
      className="min-w-0"
      data-honeyos-custom-message={role}
      data-honeyos-message-id={messageId}
      data-honeyos-streaming={isStreaming ? "true" : "false"}
    >
      {children}
    </div>
  );
}

export const honeyOSCustomization = defineHoneyOSCustomization({
  version: 1,
  id: "honeyos-default",
  productName: "HoneyOS",
  slots: { AppFrame, MessageFrame },
});
