import { useEffect, type PropsWithChildren } from "react";

import { fetchCompanionBootstrap } from "../api/companion";
import { useHoneyStore } from "./honey-store";

export function RuntimeBootstrap({ children }: PropsWithChildren) {
  const hydrate = useHoneyStore((state) => state.hydrate);
  const fail = useHoneyStore((state) => state.fail);

  useEffect(() => {
    const controller = new AbortController();
    fetchCompanionBootstrap()
      .then(hydrate)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        fail(error instanceof Error ? error.message : "bootstrap_unavailable");
      });
    return () => controller.abort();
  }, [fail, hydrate]);

  return children;
}
