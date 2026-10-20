import { ArrowRight, Check, LockKeyhole } from "lucide-react";

export function ParticipantPreparation({ submitted, playerCount, closed = false, waitlist = false }: { submitted: boolean; playerCount: number; closed?: boolean; waitlist?: boolean }) {
  const steps = [
    { title: "チームの申し込み", detail: waitlist ? "キャンセル待ちとして受け付けています。" : "チーム情報の登録は完了しています。", state: "complete" },
    { title: "メンバー登録・内容確認", detail: `登録済み ${playerCount}名。${submitted ? "メンバーは確定しています。" : closed ? "変更の受付は終了しました。" : "参加する選手を確認してください。"}`, state: submitted ? "complete" : closed ? "closed" : "current" },
    { title: "確定して、書類を保存", detail: submitted ? "請求書を確認・保存できます。" : closed ? "変更が必要な場合は運営へご連絡ください。" : "メンバーが揃ったら本エントリーを確定。", state: submitted ? "current" : closed ? "closed" : "upcoming" },
  ];
  return <section className="participant-preparation" aria-label="大会までの準備">
    <div className="participant-preparation-heading"><div><p>READY FOR THE COURT</p><h2>大会までの準備</h2></div><span>{waitlist ? "キャンセル待ち" : submitted ? "本エントリー完了" : closed ? "変更受付終了" : "メンバー登録中"}</span></div>
    <ol>{steps.map((step, index) => <li key={step.title} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
      <a href={["#team-overview", "#team-members", "#team-confirmation"][index]}><span className="participant-preparation-number" aria-hidden="true">{step.state === "complete" ? <Check size={17} /> : step.state === "closed" ? <LockKeyhole size={15} /> : String(index + 1).padStart(2, "0")}</span>
      <div><h3>{step.title}<span className="participant-sr-only">{step.state === "complete" ? "（完了）" : step.state === "current" ? "（現在の作業）" : step.state === "closed" ? "（受付終了）" : "（次の作業）"}</span></h3><p>{step.detail}</p></div>
      </a>
    </li>)}</ol>
    <div className="participant-preparation-next">
      <p>{submitted ? "準備の仕上げに、必要な書類を保存しましょう。" : closed ? "登録内容は確認できます。変更については運営へお問い合わせください。" : "まだ参加する選手がいる場合は、下の選手リストから追加できます。"}</p>
      {!closed || submitted ? <a href={submitted ? "#team-confirmation" : "#team-members"}>{submitted ? "書類の確認へ" : "選手リストへ"}<ArrowRight size={16} aria-hidden="true" /></a> : null}
    </div>
  </section>;
}
