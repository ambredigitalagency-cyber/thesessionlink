"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_COLUMNS, type ColumnKey } from "./filters";

export type ViewMode = "list" | "kanban";
export type BookingPrefs = { view: ViewMode; columns: ColumnKey[] };

const STORAGE_KEY = "tsl.bookings.prefs";
const DEFAULTS: BookingPrefs = { view: "list", columns: DEFAULT_COLUMNS };

/**
 * View mode and visible columns, remembered per browser.
 *
 * Read through `useSyncExternalStore` rather than an effect: the server has no
 * localStorage, so it renders the defaults and React reconciles on hydration,
 * with no cascading setState.
 *
 * The module holds the value once read, so a blocked or full localStorage still
 * gives a working toggle for the rest of the session — it simply does not
 * survive a reload.
 */
let current: BookingPrefs | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): BookingPrefs {
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<BookingPrefs>;
    return {
      view: parsed.view === "kanban" ? "kanban" : "list",
      columns: Array.isArray(parsed.columns) ? (parsed.columns as ColumnKey[]) : DEFAULT_COLUMNS,
    };
  } catch {
    return DEFAULTS;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Another tab of the dashboard changed the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    current = null;
    listener();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Must stay referentially stable between reads, hence the module-level cache. */
function getSnapshot(): BookingPrefs {
  if (current === null) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
    current = parse(raw);
  }
  return current;
}

function getServerSnapshot(): BookingPrefs {
  return DEFAULTS;
}

export function useBookingPrefs(): [BookingPrefs, (next: Partial<BookingPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((next: Partial<BookingPrefs>) => {
    current = { ...getSnapshot(), ...next };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Not persisted; the in-memory value above still drives the UI.
    }
    notify();
  }, []);

  return [prefs, update];
}
