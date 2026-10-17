"use client";

import { useEffect, useRef } from "react";

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useAdminDialogFocus(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const targets = () => [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
    const isTop = () => [...document.querySelectorAll('[data-admin-dialog]')].at(-1) === panel;
    (targets()[0] || panel).focus();
    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = targets(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const onFocus = (event: FocusEvent) => { if (isTop() && event.target instanceof Node && !panel.contains(event.target)) (targets()[0] || panel).focus(); };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);
  return panelRef;
}
