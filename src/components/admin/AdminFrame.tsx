import type { ReactNode } from "react";
import { Loader2, Printer } from "lucide-react";
import { CupMark } from "@/components/entry/CupMark";

export function AdminHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <section className="admin-heading"><div><p className="admin-eyebrow">VANKY CUP / ADMINISTRATION</p><h2>{title}</h2><p>{description}</p></div><div className="admin-heading-art" aria-hidden="true"><CupMark /><span>MAKE THE<br />GAME HAPPEN.</span></div>{children ? <div className="admin-heading-action">{children}</div> : null}</section>;
}

export function AdminSectionNav() {
  return <nav className="admin-section-nav" aria-label="管理項目へ移動">{[["01", "チーム・受付", "admin-teams"], ["02", "書類・当日ツール", "admin-tools"], ["03", "時間割・試合結果", "admin-matches"]].map(([number, label, id]) => <a key={id} href={`#${id}`}><span>{number}</span>{label}<span aria-hidden="true">↗</span></a>)}</nav>;
}

export function AdminState({ title, message, loading = false }: { title: string; message?: string; loading?: boolean }) {
  return <main className="admin-state"><section><div className="admin-state-cover" aria-hidden="true" /><p className="admin-eyebrow">VANKY CUP / ADMINISTRATION</p>{loading ? <Loader2 size={26} className="animate-spin" aria-hidden="true" /> : null}<h1 role={loading ? "status" : undefined}>{title}</h1>{message ? <p>{message}</p> : null}</section></main>;
}

export function AdminPrintGuide({ title, description }: { title: string; description: string }) {
  return <section className="admin-print-guide print:hidden"><div><p className="admin-eyebrow">ADMINISTRATION / DOCUMENT DESK</p><h1><Printer size={22} aria-hidden="true" />{title}</h1><p>{description}</p></div><span aria-hidden="true">READY<br />FOR TIP-OFF.</span></section>;
}
