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
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>BasketEntry</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
          バスケットボール<br />
          大会管理システム
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
          次世代の大会運営プラットフォームへようこそ。<br />
          チーム登録、スケジュール確認、保険手続きをこれまで以上にスムーズに。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link href="/login" className="group">
          <Card className="h-full hover:border-indigo-500/50 transition-all hover:bg-slate-800/80 group-hover:scale-[1.02] duration-300">
            <div className="flex flex-col h-full">
              <div className="p-3 bg-indigo-500/10 w-fit rounded-lg mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-2 text-white group-hover:text-indigo-300 transition-colors">
                チーム代表者はこちら
              </h2>
              <p className="text-slate-400 mb-6 flex-1">
                選手登録、登録内容の変更、大会情報の確認はこちらから行えます。
              </p>
              <div className="flex items-center text-indigo-400 font-medium">
                ポータルへ進む <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin" className="group">
          <Card className="h-full hover:border-pink-500/50 transition-all hover:bg-slate-800/80 group-hover:scale-[1.02] duration-300">
            <div className="flex flex-col h-full">
              <div className="p-3 bg-pink-500/10 w-fit rounded-lg mb-4 group-hover:bg-pink-500/20 transition-colors">
                <ShieldCheck className="w-8 h-8 text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-2 text-white group-hover:text-pink-300 transition-colors">
                運営者ダッシュボード
              </h2>
              <p className="text-slate-400 mb-6 flex-1">
                参加チーム状況の確認、保険リストや抽選券の印刷データの出力はこちら。
              </p>
              <div className="flex items-center text-pink-400 font-medium">
                管理画面へアクセス <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <footer className="absolute bottom-6 text-slate-600 text-sm">
        &copy; 2025 BasketEntry
      </footer>
    </main>
  );
}
