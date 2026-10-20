"use client";

import { useCallback, useSyncExternalStore } from 'react';

const preferenceEvent = 'asket-preference-change';
function subscribe(listener: () => void) {
    window.addEventListener('storage', listener);
    window.addEventListener(preferenceEvent, listener);
    return () => {
        window.removeEventListener('storage', listener);
        window.removeEventListener(preferenceEvent, listener);
    };
}

/** Stable string snapshots keep server rendering and browser hydration consistent. */
export function useBrowserPreference(key: string, fallback: string) {
    const getSnapshot = useCallback(() => {
        try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    }, [key, fallback]);
    const getServerSnapshot = useCallback(() => fallback, [fallback]);
    const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const setValue = useCallback((next: string) => {
        localStorage.setItem(key, next);
        window.dispatchEvent(new Event(preferenceEvent));
    }, [key]);
    return [value, setValue] as const;
}
