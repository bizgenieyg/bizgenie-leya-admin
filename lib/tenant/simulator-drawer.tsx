'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';

type SimulatorDrawerValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  dirty: boolean;
  /** Each settings form reports its own unsaved state; the warning shows while any of them is dirty. */
  setDirty: (source: string, dirty: boolean) => void;
  returnFocus: () => void;
  rememberFocus: () => void;
};

const STORAGE_KEY = 'leya-simulator-drawer-open';
const noop = () => {};
const C = createContext<SimulatorDrawerValue>({
  open: false, openDrawer: noop, closeDrawer: noop, toggleDrawer: noop,
  dirty: false, setDirty: noop, returnFocus: noop, rememberFocus: noop,
});

export function SimulatorDrawerProvider({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  const [dirtySources, setDirtySources] = useState<Record<string, boolean>>({});
  const dirty = Object.values(dirtySources).some(Boolean);
  const setDirty = useCallback((source: string, value: boolean) => {
    setDirtySources(current => current[source] === value ? current : { ...current, [source]: value });
  }, []);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setOpen(true);
    } catch { /* localStorage may be unavailable (private mode, quota) */ }
  }, []);

  const persist = useCallback((next: boolean) => {
    setOpen(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
  }, []);

  const rememberFocus = useCallback(() => {
    lastFocused.current = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
  }, []);
  const returnFocus = useCallback(() => { lastFocused.current?.focus?.(); }, []);
  const openDrawer = useCallback(() => { rememberFocus(); persist(true); }, [persist, rememberFocus]);
  const closeDrawer = useCallback(() => { persist(false); returnFocus(); }, [persist, returnFocus]);
  const toggleDrawer = useCallback(() => { if (open) closeDrawer(); else openDrawer(); }, [open, openDrawer, closeDrawer]);

  return <C.Provider value={{open, openDrawer, closeDrawer, toggleDrawer, dirty, setDirty, returnFocus, rememberFocus}}>{children}</C.Provider>;
}

export const useSimulatorDrawer = () => useContext(C);
