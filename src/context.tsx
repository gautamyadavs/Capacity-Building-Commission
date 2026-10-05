import { createContext, useContext, useSyncExternalStore } from "react";
import type { Config } from "./model";
import type { RunStore } from "./persistence";
export const AppContext = createContext<{
  config: Config;
  store: RunStore;
} | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Missing application context");
  return value;
}
export function useSession() {
  const { config: latestConfig, store } = useApp();
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...view, store, config: view.run.config, latestConfig };
}
