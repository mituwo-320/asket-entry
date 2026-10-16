import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { CupMark } from "@/components/entry/CupMark";

export function ParticipantTheme({ children }: { children: ReactNode }) {
  return <div className="entry-surface participant-surface">
    {children}
    <footer className="participant-footer print:hidden"><span className="participant-footer-brand">vankycup<i aria-hidden="true" /></span><span>PLAY TOGETHER.</span><span>&copy; {new Date().getFullYear()} vankycup</span></footer>
  </div>;
}

export function ParticipantHeader({ backHref, backLabel = "マイページ", actions }: { backHref?: string; backLabel?: string; actions?: ReactNode }) {
  return <header className="participant-header print:hidden"><div className="participant-header-inner">
    <Link href="/" className="participant-brand" aria-label="ヴァンキーカップ トップ">vanky<span>cup</span><i aria-hidden="true" /></Link>
    <span className="participant-header-label">参加者ページ</span>
    <nav className="participant-header-actions" aria-label="参加者メニュー">
      {backHref ? <Link href={backHref} className="participant-back"><ArrowLeft aria-hidden="true" size={16} /><span>{backLabel}</span></Link> : null}
      {actions}
    </nav>
  </div></header>;
}

export function ParticipantHeading({ eyebrow, title, description, children, className = "" }: { eyebrow: string; title: string; description: string; children?: ReactNode; className?: string }) {
  return <section className={`participant-heading ${className}`}>
    <div className="participant-heading-copy"><p className="participant-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="participant-heading-description">{description}</p>{children}</div>
    <div className="participant-heading-art" aria-hidden="true"><span>VANKY CUP<br />PLAY TOGETHER.</span><CupMark className="participant-mark" /></div>
  </section>;
}

export function ParticipantFormTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: ReactNode }) {
  return <div className="participant-form-title"><p className="participant-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p><span className="participant-form-stripes" aria-hidden="true"><i /><i /><i /></span></div>;
}

export function ParticipantSectionNav({ label = "このページの案内", items }: { label?: string; items: { href: string; label: string }[] }) {
  return <nav className="participant-section-nav" aria-label={label} data-count={items.length}>
    {items.map((item, index) => <a key={item.href} href={item.href}><span className="participant-nav-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span><ArrowUpRight size={16} aria-hidden="true" /></a>)}
  </nav>;
}

export function ParticipantSectionTitle({ id, number, title, description }: { id?: string; number: string; title: string; description?: string }) {
  return <div id={id} className="participant-section-heading"><span aria-hidden="true">{number}</span><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></div>;
}

export function ParticipantFormFooter() {
  return <div className="participant-form-footer" aria-hidden="true"><span>VANKY CUP / TEAM DESK</span><span className="participant-print-bars" /><span>PLAY TOGETHER.</span></div>;
}

export function ParticipantState({ title, message, loading = false, href = "/dashboard", linkLabel = "マイページへ戻る" }: { title: string; message?: string; loading?: boolean; href?: string; linkLabel?: string }) {
  return <div className="participant-state-screen"><section className="participant-state" aria-busy={loading}>
    {loading ? <Loader2 className="participant-state-icon animate-spin" aria-hidden="true" /> : <CupMark className="participant-state-mark" />}
    <h1>{title}</h1>{message ? <p>{message}</p> : null}
    {!loading ? <Link href={href} className="participant-state-link">{linkLabel}</Link> : null}
  </section></div>;
}
