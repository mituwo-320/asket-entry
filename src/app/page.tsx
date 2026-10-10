import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { EntryStatus } from "@/components/entry/EntryStatus";
import "./entry.css";

export default function Home() {
  return (
    <div className="entry-surface cup-home">
      <header className="cup-header">
        <Link href="/" aria-label="ヴァンキーカップ トップ" className="cup-wordmark">vanky<span>cup</span><i aria-hidden="true" /></Link>
        <span className="cup-header-label">ヴァンキーカップ 参加受付</span>
        <Link href="/login" className="cup-header-login">ログイン <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </header>
      <main>
        <section className="cup-hero" aria-labelledby="entry-heading">
          <div className="cup-court" aria-hidden="true">
            <svg viewBox="0 0 600 600" fill="none"><circle cx="300" cy="300" r="238" /><circle cx="300" cy="300" r="145" /><path d="M62 300h476M300 62v476M130 130c190 0 340 150 340 340M130 470c0-190 150-340 340-340" /></svg>
          </div>
          <div className="cup-hero-copy">
            <p className="cup-eyebrow"><span /> TEAM ENTRY</p>
            <h1 id="entry-heading">ヴァンキー<br />カップ<span className="cup-title-period">.</span></h1>
            <p className="cup-hero-subtitle">その一日を、<br className="cup-mobile-break" />チームで楽しもう。</p>
            <p className="cup-hero-description">大会への参加申し込み、メンバーの登録。<br />チームの準備は、ここから。</p>
            <div className="cup-status"><EntryStatus /></div>
          </div>
          <div className="cup-entry-stack">
            <section className="cup-entry-card" aria-labelledby="new-team-heading">
              <div className="cup-card-top"><span>ENTRY</span><span>01 / NEW TEAM</span></div>
              <div className="cup-card-body">
                <p className="cup-card-kicker">はじめて参加する方</p>
                <h2 id="new-team-heading">さあ、チームで<br />参加しよう。</h2>
                <p className="cup-card-description">代表者の方がチーム情報を登録してください。<br />ほかのメンバーは、申し込み後に追加できます。</p>
                <Link href="/team/register" className="cup-entry-button">チームを登録する <span><ArrowUpRight aria-hidden="true" size={22} /></span></Link>
                <p className="cup-card-note">受付中の大会日程は、登録画面で選べます。</p>
              </div>
            </section>
            <section className="cup-returning" aria-labelledby="existing-team-heading">
              <div><p>ALREADY REGISTERED?</p><h2 id="existing-team-heading">登録済みの方はこちら</h2><span>登録内容の確認・変更、メンバーの追加</span></div>
              <Link href="/login" aria-label="登録済みの方：ログインする"><ArrowRight aria-hidden="true" size={24} /></Link>
            </section>
          </div>
        </section>
        <section className="cup-flow" aria-labelledby="entry-flow-heading">
          <div className="cup-flow-heading"><p>HOW TO ENTER</p><h2 id="entry-flow-heading">参加までの、3ステップ。</h2></div>
          <ol>
            {[
              ["01", "大会日程を選ぶ", "受付中の大会から、参加する日程を選択。"],
              ["02", "チーム情報を登録", "チーム名と、代表者の連絡先などを入力。"],
              ["03", "メンバーを追加", "申し込み後、マイページでメンバーを登録。"],
            ].map(([number, title, description]) => (
              <li key={number}><span aria-hidden="true">{number}</span><div><h3>{title}</h3><p>{description}</p></div></li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="cup-footer"><span className="cup-footer-brand">vankycup</span><span>&copy; {new Date().getFullYear()} vankycup</span><span>TEAM ENTRY</span></footer>
    </div>
  );
}
