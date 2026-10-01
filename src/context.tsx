import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Config, Mode } from './model';
import type { RunStore } from './persistence';
export const AppContext = createContext<{ config: Config; stores: Record<Mode, RunStore> } | null>(null);
export const ModeContext = createContext<Mode>('learner');
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('Missing application context'); return value; }
export function useSession(modeOverride?: Mode) {
  const mode = useContext(ModeContext);
  const { config, stores } = useApp();
  const store = stores[modeOverride || mode];
  const view = useSyncExternalStore(store.subscribe,store.getSnapshot);
  return { ...view, store, config, mode: modeOverride || mode };
}
