import { useEffect, type PropsWithChildren } from "react";

import { fetchCompanionBootstrap } from "../api/companion";
import { useHoneyStore } from "./honey-store";

export function RuntimeBootstrap({ children }: PropsWithChildren) {
  const hydrate = useHoneyStore((state) => state.hydrate);
  const fail = useHoneyStore((state) => state.fail);

  useEffect(() => {
    const controller = new AbortController();
    const delays = [0, 600, 1500, 3000];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async (attempt: number) => {
      try {
        hydrate(await fetchCompanionBootstrap(controller.signal));
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const nextDelay = delays[attempt + 1];
        if (nextDelay !== undefined) {
          timer = setTimeout(() => void load(attempt + 1), nextDelay);
          return;
        }
        fail(error instanceof Error ? error.message : "bootstrap_unavailable");
      }
    };

    void load(0);
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [fail, hydrate]);

  return children;
}
