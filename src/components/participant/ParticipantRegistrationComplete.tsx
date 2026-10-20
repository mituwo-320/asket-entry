"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Copy, Eye, EyeOff, MessageCircle, Clock3 } from "lucide-react";
import { CupMark } from "@/components/entry/CupMark";
import { ParticipantFormFooter, ParticipantHeader } from "./ParticipantFrame";

interface RegistrationCompleteProps {
  teamName: string;
  projectName?: string;
  email: string;
  password: string | null;
  existingAccount: boolean;
  isWaitlist: boolean;
  lineOpenChatLink?: string;
}

export function ParticipantRegistrationComplete({ teamName, projectName, email, password, existingAccount, isWaitlist, lineOpenChatLink }: RegistrationCompleteProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    heading.current?.focus();
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);

  async function copy(value: string, field: "email" | "password") {
    if (copying) return;
    setCopying(true);
    setCopyError("");
    setCopied(null);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      feedbackTimer.current = setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopyError("コピーできませんでした。文字を選択して、お手元のメモなどに保存してください。");
    } finally {
      setCopying(false);
    }
  }

  return <>
    <ParticipantHeader backHref="/dashboard" />
    <main id="participant-main" tabIndex={-1} className="participant-completion-page">
      <section className="participant-completion-ticket" aria-labelledby="registration-complete-title" data-waitlist={isWaitlist}>
        <div className="participant-completion-cover" aria-hidden="true"><span>VANKY CUP / TEAM ENTRY</span><CupMark /><span>PLAY<br />TOGETHER.</span></div>
        <header className="participant-completion-result">
          <p className="participant-completion-stamp">{isWaitlist ? <Clock3 size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}{isWaitlist ? "WAITLIST RECEIVED" : "ENTRY RECEIVED"}</p>
          <h1 id="registration-complete-title" ref={heading} tabIndex={-1}>{isWaitlist ? "キャンセル待ちを受け付けました" : "チームの申し込みを受け付けました"}</h1>
          <p>{isWaitlist ? "現在はキャンセル待ちです。空きが出た場合は、管理者よりご連絡します。" : "次はメンバーの登録と内容の確認へ。マイページから準備を進められます。"}</p>
          <dl className="participant-completion-summary"><div><dt>大会</dt><dd>{projectName || "申し込んだ大会"}</dd></div><div><dt>チーム</dt><dd>{teamName}</dd></div><div><dt>受付状況</dt><dd>{isWaitlist ? "キャンセル待ち（参加未確定）" : "申し込み受付済み"}</dd></div></dl>
          {isWaitlist ? <p className="participant-completion-waitlist">この時点では、大会への参加は確定していません。</p> : null}
        </header>
        <div className="participant-completion-body">
          <section className="participant-completion-section" aria-labelledby="completion-account">
            <div className="participant-completion-section-heading"><span aria-hidden="true">01</span><div><h2 id="completion-account">ログイン情報を確認</h2><p>{existingAccount ? "お使いのアカウントで申し込みました。次回も同じ情報でログインできます。" : "次回ログインに使う情報です。お手元に控えておいてください。"}</p></div></div>
            <div className="participant-completion-account"><span>メールアドレス</span><div><p>{email}</p><button type="button" disabled={copying} aria-label="メールアドレスをコピー" onClick={() => copy(email, "email")}>{copied === "email" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}<span>コピー</span></button></div></div>
            <div className="participant-completion-account"><span>パスワード</span>{password ? <>
              <div><p className={visible ? "" : "participant-completion-masked"}>{visible ? password : "••••••••"}</p><button type="button" aria-label={`パスワードを${visible ? "隠す" : "表示"}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}<span>{visible ? "隠す" : "表示"}</span></button><button type="button" disabled={copying} aria-label="パスワードをコピー" onClick={() => copy(password, "password")}>{copied === "password" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}<span>コピー</span></button></div>
              <p className="participant-completion-account-help">表示すると確認できます。保存後は、周囲に見えないよう非表示に戻してください。</p>
            </> : <p className="participant-completion-account-help">登録済みのパスワードをご利用ください。</p>}</div>
            <p className="participant-completion-copy-status" role="status">{copied ? `${copied === "email" ? "メールアドレス" : "パスワード"}をコピーしました。` : ""}</p>
            {copyError ? <p className="participant-feedback participant-feedback-error" role="alert">{copyError}</p> : null}
          </section>
          {lineOpenChatLink ? <section className="participant-completion-section" aria-labelledby="completion-contact">
            <div className="participant-completion-section-heading"><span aria-hidden="true">02</span><div><h2 id="completion-contact">大会の連絡を受け取る <b>代表者は必須</b></h2><p>集合時間・場所、持ち物、変更や中止の案内は、LINEオープンチャットでお知らせします。</p></div></div>
            <div className="participant-completion-line"><MessageCircle size={24} aria-hidden="true" /><p>代表者の方が参加してください。<br />リンクは別のタブで開きます。</p><a href={lineOpenChatLink} target="_blank" rel="noopener noreferrer">LINEオープンチャットに参加 <ArrowRight size={17} aria-hidden="true" /></a></div>
          </section> : null}
          <section className="participant-completion-section" aria-labelledby="completion-next">
            <div className="participant-completion-section-heading"><span aria-hidden="true">{lineOpenChatLink ? "03" : "02"}</span><div><h2 id="completion-next">{isWaitlist ? "受付状況をマイページで確認" : "メンバー登録と内容の確認へ"}</h2><p>{isWaitlist ? "キャンセル待ちの状況と、登録したチーム情報を確認できます。" : "メンバーを追加し、期限までに内容を確認して確定してください。登録期限はマイページで確認できます。"}</p></div></div>
            <Link className="participant-completion-next" href="/dashboard">{isWaitlist ? "マイページで受付状況を確認" : "マイページで準備を進める"}<ArrowRight size={19} aria-hidden="true" /></Link>
            {lineOpenChatLink ? <p className="participant-completion-reminder">LINEへの参加がまだの方は、忘れずにご確認ください。</p> : null}
          </section>
          <ParticipantFormFooter />
        </div>
      </section>
      <p className="participant-completion-endnote">VANKY CUP / SEE YOU ON THE COURT.</p>
    </main>
  </>;
}
