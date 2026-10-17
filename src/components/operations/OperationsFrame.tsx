import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { CupMark } from "@/components/entry/CupMark";

export function OperationsHeader({ title = "運営デスク", backHref = "/management", backLabel = "大会一覧", children }: { title?: string; backHref?: string; backLabel?: string; children?: ReactNode }) {
  return <header className="operations-header"><div><Link href={backHref} className="operations-back"><ArrowLeft size={17} aria-hidden="true" />{backLabel}</Link><p><span>VANKY CUP / OPERATIONS</span><strong>{title}</strong></p><nav aria-label="運営メニュー">{children}</nav></div></header>;
}

export function OperationsHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <section className="operations-heading"><div><p>{eyebrow}</p><h1>{title}</h1><p>{description}</p>{children}</div><div className="operations-heading-art" aria-hidden="true"><span>BEHIND<br />THE GOOD GAME.</span><CupMark /></div></section>;
}

export function OperationsOverview({ items }: { items: { label: string; value: number; note: string; attention?: boolean }[] }) {
  return <dl className="operations-overview" aria-label="受付状況の集計">{items.map(item => <div key={item.label} data-attention={item.attention && item.value > 0}><dt>{item.label}</dt><dd>{item.value}<span>チーム</span><p>{item.note}</p></dd></div>)}</dl>;
}

export function OperationsState({ title, message, loading = false }: { title: string; message?: string; loading?: boolean }) {
  return <main id="operations-main" tabIndex={-1} className="operations-state"><section><div aria-hidden="true" className="operations-state-cover" /><p>VANKY CUP / OPERATIONS</p>{loading ? <Loader2 size={27} aria-hidden="true" className="animate-spin" /> : null}<h1 aria-live="polite">{title}</h1>{message ? <p>{message}</p> : null}{!loading ? <Link href="/management">大会一覧へ戻る</Link> : null}</section></main>;
}

export function OperationsPrintGuide({ title, description }: { title: string; description: string }) {
  return <section className="operations-print-guide print:hidden"><div><span>OPERATIONS / DOCUMENT DESK</span><h1><Printer size={22} aria-hidden="true" />{title}</h1><p>{description}</p></div><span className="operations-print-mark" aria-hidden="true">CHECK.<br />PRINT.<br />READY.</span></section>;
}
