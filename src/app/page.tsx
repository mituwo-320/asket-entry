import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntryStatus } from "@/components/entry/EntryStatus";
import "./entry.css";

export default function Home() {
  return (
    <div className="entry-surface flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link href="/" aria-label="ヴァンキーカップ トップ" className="entry-brand">
            vankycup<span className="ml-3 text-xs font-normal tracking-normal text-stone-500">参加受付</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-emerald-800">ログイン</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-20">
        <div className="grid items-start gap-10 md:grid-cols-[1fr_1.05fr] md:gap-16">
          <section aria-labelledby="entry-heading" className="md:pt-6">
            <p className="mb-5 text-sm font-medium text-emerald-800">ヴァンキーカップ</p>
            <h1 id="entry-heading" className="text-3xl font-bold leading-snug tracking-tight text-stone-900 sm:text-4xl">
              チームで参加する。<br />ここからはじめよう。
            </h1>
            <p className="mt-6 text-base leading-8 text-stone-600">
              大会の参加申し込みと、メンバーの登録を<br className="hidden sm:block" />こちらで受け付けています。
            </p>
            <div className="mt-8 border-t border-stone-200 pt-6"><EntryStatus /></div>
          </section>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <section aria-labelledby="new-team-heading" className="p-6 sm:p-8">
              <p className="mb-3 text-xs font-medium text-stone-500">はじめて参加する方</p>
              <h2 id="new-team-heading" className="text-xl font-bold text-stone-900">チームの参加申し込み</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">代表者の方がチーム情報を登録してください。<br />ほかのメンバーは、申し込み後に追加できます。</p>
              <Link href="/team/register" className="entry-primary mt-6 flex min-h-12 items-center justify-between gap-4 rounded-md px-5 py-3 font-medium">
                チームを登録する<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </section>
            <section aria-labelledby="existing-team-heading" className="border-t border-stone-200 bg-stone-50 p-6 sm:px-8">
              <h2 id="existing-team-heading" className="text-base font-bold text-stone-900">登録済みの方</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">登録内容の確認・変更や、メンバーの追加はこちら。</p>
              <Link href="/login" className="mt-4 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
                ログインする<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>
        <section aria-labelledby="entry-flow-heading" className="mt-14 border-t border-stone-200 pt-8 sm:mt-20">
          <h2 id="entry-flow-heading" className="text-base font-bold text-stone-900">参加申し込みの流れ</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              ["01", "大会日程を選ぶ", "受付中の大会から、参加する日程を選択します。"],
              ["02", "チーム情報を登録", "チーム名と、代表者の連絡先などを入力します。"],
              ["03", "メンバーを追加", "申し込み後、マイページでメンバーを登録します。"],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-4">
                <span aria-hidden="true" className="pt-0.5 text-sm font-semibold tabular-nums text-emerald-800">{number}</span>
                <div><h3 className="text-sm font-semibold text-stone-800">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-stone-200 px-5 py-6 text-center text-xs text-stone-500">&copy; {new Date().getFullYear()} vankycup</footer>
    </div>
  );
}
