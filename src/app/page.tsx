import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Users, ShieldCheck, Trophy, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="text-center max-w-2xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-sm mb-6 backdrop-blur-md">
          <Trophy className="w-4 h-4 text-emerald-500" />
          <span className="font-bold tracking-wider">vankycup</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
          ヴァンキーカップ<br />
          エントリー
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
          チームエントリー、メンバーの登録など<br />
          スムーズに登録できます。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link href="/team/register" className="group">
          <Card className="h-full hover:border-emerald-500/50 transition-all hover:bg-slate-800/80 group-hover:scale-[1.02] duration-300">
            <div className="flex flex-col h-full">
              <div className="p-3 bg-emerald-500/10 w-fit rounded-lg mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-2 text-white group-hover:text-emerald-300 transition-colors">
                はじめての方 (新規登録)
              </h2>
              <p className="text-slate-400 mb-6 flex-1">
                大会への新規エントリーはこちらから。チーム情報と代表者情報を登録して参加申し込みを行います。
              </p>
              <div className="flex items-center text-emerald-400 font-medium">
                新規登録へ進む <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/login" className="group">
          <Card className="h-full hover:border-indigo-500/50 transition-all hover:bg-slate-800/80 group-hover:scale-[1.02] duration-300">
            <div className="flex flex-col h-full">
              <div className="p-3 bg-indigo-500/10 w-fit rounded-lg mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-2 text-white group-hover:text-indigo-300 transition-colors">
                登録済みの方 (ログイン)
              </h2>
              <p className="text-slate-400 mb-6 flex-1">
                すでに登録済みのチーム代表者はこちら。登録内容の変更や、大会スケジュールの確認が行えます。
              </p>
              <div className="flex items-center text-indigo-400 font-medium">
                ログイン画面へ <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <footer className="mt-20 border-t border-slate-800/50 pt-8 pb-4 w-full flex justify-center text-sm text-slate-500 relative z-10 font-mono">
        &copy; 2026 vankycup
      </footer>
    </main>
  );
}
