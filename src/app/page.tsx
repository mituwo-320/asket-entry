import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { EntryStatus } from "@/components/entry/EntryStatus";
import "./entry.css";
import { CupMark } from "@/components/entry/CupMark";

function StepIllustration({ step }: { step: number }) {
  return (
    <svg className="cup-step-art" viewBox="0 0 150 88" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {step === 1 ? <>
        <path className="cup-art-shadow" d="M31 74h93l-11 7H20Z" />
        <path d="m42 15 78 8-6 56-78-8Z" className="cup-art-paper" />
        <path d="m42 33 76 8M55 12l-2 12m51-7-1 13M49 45l6 1m9 1 6 1m9 1 6 1m9 1 6 1M47 58l6 1m9 1 6 1m9 1 6 1m9 1 6 1" />
        <circle cx="80" cy="50" r="10" className="cup-art-accent" /><path d="m76 50 3 3 6-6" />
        <path d="m25 29 7 1m-5-12 5 6m-13-2 5 3" className="cup-art-accent-line" />
      </> : step === 2 ? <>
        <path className="cup-art-shadow" d="M42 75h82l-14 6H27Z" />
        <path d="m49 13 59 5-5 62-59-5Z" className="cup-art-paper" />
        <path d="m65 10 26 2-1 12-26-2Z" className="cup-art-accent" />
        <path d="m57 37 7 1m8 0 24 2M56 49l7 1m8 0 24 2M55 61l7 1m8 0 15 1" />
        <path d="m111 39 8 5-26 28-10 5 4-11Z" fill="var(--entry-accent)" /><path d="m109 42 7 5m-29 19 6 6" />
      </> : <>
        <path className="cup-art-shadow" d="M17 75h119l-12 7H29Z" />
        <path d="m79 17 14-6c0 10 13 12 17 2l14 8-4 20-10-3-3 38-40-4 3-38-8 1 4-19Z" className="cup-art-paper" />
        <path d="m35 20 13-6c1 12 14 12 17 0l15 8-4 20-10-3 1 39H26l2-39-10 3-4-20Z" className="cup-art-accent" />
        <path d="M45 39v22m-6-18 6-4m8 0h8l-8 22m35-25 10 1-11 19m-62 17h40" />
      </>}
    </svg>
  );
}

export default function Home() {
  return (
    <div className="entry-surface cup-home">
      <div className="cup-print-texture" aria-hidden="true" />
      <header className="cup-header">
        <Link href="/" aria-label="ヴァンキーカップ トップ" className="cup-wordmark">vanky<span>cup</span><i aria-hidden="true" /></Link>
        <span className="cup-header-label">大会参加受付</span>
        <div className="cup-header-rule" aria-hidden="true"><span /><span /><span /></div>
        <Link href="/login" className="cup-header-login">ログイン <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </header>
      <main>
        <section className="cup-hero" aria-labelledby="entry-heading">
          <div className="cup-court" aria-hidden="true">
            <svg viewBox="0 0 700 600" fill="none">
              <path d="M90 75h520v450H90Z M350 75v450" /><circle cx="350" cy="300" r="70" />
              <path d="M90 220h110v160H90m520-160H500v160h110M90 140c255 0 255 320 0 320m520-320c-255 0-255 320 0 320" />
              <path d="M110 270v60m480-60v60" /><circle cx="126" cy="300" r="12" /><circle cx="574" cy="300" r="12" />
              <path d="M74 59h22m-6-6v22m504-16h22m-6-6v22M74 541h22m-6-16v22m504-6h22m-6-16v22" />
            </svg>
          </div>
          <span className="cup-side-note" aria-hidden="true">VANKY CUP — TEAM ENTRY</span>
          <div className="cup-hero-copy">
            <p className="cup-eyebrow"><span /> みんなでつくる、大会の一日。</p>
            <div className="cup-title-block">
              <p className="cup-title-caption" aria-hidden="true">VANKY CUP</p>
              <h1 id="entry-heading">ヴァンキー<br />カップ<span className="cup-title-period">.</span></h1>
              <CupMark />
            </div>
            <p className="cup-hero-subtitle">その一日を、<br className="cup-mobile-break" /><span className="cup-marker">チームで楽しもう。<svg viewBox="0 0 280 14" preserveAspectRatio="none" aria-hidden="true"><path d="M3 9C69 0 153 2 275 6M18 12c83-6 162-7 243-3" /></svg></span></p>
            <p className="cup-hero-description">大会への参加申し込み、メンバーの登録。<br />チームの準備は、ここから。</p>
            <div className="cup-status"><span className="cup-status-tab" aria-hidden="true">INFORMATION</span><EntryStatus /></div>
          </div>
          <div className="cup-entry-stack">
            <span className="cup-ticket-tab" aria-hidden="true">TEAM ENTRY</span>
            <section className="cup-entry-card" aria-labelledby="new-team-heading">
              <div className="cup-ticket-spine" aria-hidden="true"><span>VANKY CUP</span><i /><span>ENTRY</span></div>
              <div className="cup-ticket-content">
                <div className="cup-card-top"><span>参加エントリー</span><span>01 / NEW TEAM</span></div>
                <div className="cup-card-body">
                  <div className="cup-card-intro"><p className="cup-card-kicker">はじめて参加する方</p><span className="cup-ticket-monogram" aria-hidden="true">V<span>CUP</span></span></div>
                  <h2 id="new-team-heading">さあ、チームで<br />参加しよう。</h2>
                  <p className="cup-card-description">代表者の方がチーム情報を登録してください。<br />ほかのメンバーは、申し込み後に追加できます。</p>
                  <div className="cup-ticket-divider" aria-hidden="true"><span /><span /></div>
                  <Link href="/team/register" className="cup-entry-button">チームを登録する <span><ArrowUpRight aria-hidden="true" size={22} /></span></Link>
                  <p className="cup-card-note">受付中の大会日程は、登録画面で選べます。</p>
                </div>
                <div className="cup-ticket-bottom" aria-hidden="true"><span>VANKY CUP / TEAM REGISTRATION</span><span className="cup-ticket-bars" /></div>
              </div>
            </section>
            <section className="cup-returning" aria-labelledby="existing-team-heading">
              <div><p>チームのマイページ</p><h2 id="existing-team-heading">登録済みの方はこちら</h2><span>登録内容の確認・変更、メンバーの追加</span></div>
              <Link href="/login" aria-label="登録済みの方：ログインする"><span>ログイン</span><ArrowRight aria-hidden="true" size={18} /></Link>
            </section>
          </div>
        </section>
        <div className="cup-rally-strip" aria-hidden="true"><span>PLAY TOGETHER.</span><i /><span>その一日が、チームの思い出に。</span><i /><span>VANKY CUP</span></div>
        <section className="cup-flow" aria-labelledby="entry-flow-heading">
          <div className="cup-flow-heading"><p>ENTRY GUIDE</p><h2 id="entry-flow-heading">参加までの<br />3ステップ。</h2><span className="cup-guide-arrow" aria-hidden="true"><svg viewBox="0 0 130 48"><path d="M4 11C44 41 82 40 117 22m-23-1 25-2-7 21" /></svg></span></div>
          <ol>
            {[
              { number: "01", title: "大会日程を選ぶ", description: "受付中の大会から、参加する日程を選択。" },
              { number: "02", title: "チーム情報を登録", description: "チーム名と、代表者の連絡先などを入力。" },
              { number: "03", title: "メンバーを追加", description: "申し込み後、マイページでメンバーを登録。" },
            ].map(({ number, title, description }, index) => (
              <li key={number}>
                <div className="cup-step-top"><span aria-hidden="true"><small>STEP</small>{number}</span><StepIllustration step={index + 1} /></div>
                <h3>{title}</h3><p>{description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="cup-footer"><span className="cup-footer-brand">vankycup<i aria-hidden="true" /></span><span>&copy; {new Date().getFullYear()} vankycup</span><span>LET’S PLAY TOGETHER.</span></footer>
    </div>
  );
}
