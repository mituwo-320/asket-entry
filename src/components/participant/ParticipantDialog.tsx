"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ParticipantDialog({ isOpen, onClose, title, description, eyebrow = "VANKY CUP / TEAM DESK", busy = false, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; });

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
    const firstTarget = panel.querySelector<HTMLElement>('[data-dialog-initial]') || panel.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || focusable()[0] || panel;
    firstTarget.focus();

    const isTopDialog = () => [...document.querySelectorAll('[data-participant-dialog]')].at(-1) === panel;
    const handleKey = (event: KeyboardEvent) => {
      if (!isTopDialog()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key === "Tab") {
        const targets = focusable();
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) { event.preventDefault(); panel.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (isTopDialog() && event.target instanceof Node && !panel.contains(event.target)) (focusable()[0] || panel).focus();
    };
    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("focusin", handleFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return <div className="participant-dialog-layer">
    <div className="participant-dialog-backdrop" aria-hidden="true" onClick={() => { if (!busy) onClose(); }} />
    <div ref={panelRef} data-participant-dialog role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} aria-busy={busy} tabIndex={-1} className="participant-work-dialog">
      <header className="participant-work-dialog-header">
        <p>{eyebrow}</p><h2 id={titleId}>{title}</h2>
        {description ? <p id={descriptionId} className="participant-work-dialog-description">{description}</p> : null}
        <button type="button" aria-label="閉じる" disabled={busy} onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="participant-work-dialog-content">{children}</div>
      <div className="participant-work-dialog-footer" aria-hidden="true"><span>VANKY CUP / TEAM DESK</span><span className="participant-print-bars" /></div>
    </div>
  </div>;
}

export function ParticipantConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = "OK", cancelLabel = "キャンセル", danger = false }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; title: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean;
}) {
  if (!isOpen) return null;
  return <Confirmation onClose={onClose} onConfirm={onConfirm} title={title} message={message} confirmLabel={confirmLabel} cancelLabel={cancelLabel} danger={danger} />;
}

function Confirmation({ onClose, onConfirm, title, message, confirmLabel, cancelLabel, danger }: Omit<Parameters<typeof ParticipantConfirmDialog>[0], "isOpen"> & { confirmLabel: string; cancelLabel: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const confirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try { await onConfirm(); onClose(); }
    catch { setError("処理を完了できませんでした。内容を確認して、もう一度お試しください。"); }
    finally { pendingRef.current = false; setPending(false); }
  };
  return <ParticipantDialog isOpen onClose={onClose} title={title} eyebrow={danger ? "PLEASE CONFIRM / TEAM DESK" : "FINAL CHECK / TEAM DESK"} busy={pending}>
    <div className="participant-confirm-message"><AlertTriangle size={24} aria-hidden="true" /><p>{message}</p></div>
    {error ? <p role="alert" className="participant-feedback participant-feedback-error">{error}</p> : null}
    <div className="participant-dialog-actions">
      <Button type="button" variant="outline" data-dialog-initial disabled={pending} onClick={onClose}>{cancelLabel}</Button>
      <Button type="button" disabled={pending} onClick={confirm}>{pending ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" />処理中…</> : confirmLabel}</Button>
    </div>
  </ParticipantDialog>;
}

export function ParticipantAlertDialog({ isOpen, onClose, title, message }: { isOpen: boolean; onClose: () => void; title: string; message: string }) {
  return <ParticipantDialog isOpen={isOpen} onClose={onClose} title={title} eyebrow="TEAM DESK / INFORMATION">
    <p className="participant-dialog-message">{message}</p>
    <div className="participant-dialog-actions"><Button type="button" data-dialog-initial onClick={onClose}>閉じる</Button></div>
  </ParticipantDialog>;
}
