"use client";

import { useState } from "react";
import Link from "next/link";
import { CupMark } from "@/components/entry/CupMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                // To replace history and redirect to admin safely
                window.location.href = "/admin";
            } else {
                const data = await res.json();
                setError(data.error || "認証に失敗しました");
            }
        } catch {
            setError("通信エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-workspace admin-login">
            <aside className="admin-login-poster"><div><span>VANKY CUP / TOURNAMENT ADMINISTRATION</span><CupMark /><h2>いい大会は、<br />準備から始まる。</h2><p>エントリーも、チームの準備も、当日の進行も。<br />コートの外から、みんなの試合を支える。</p></div><ol><li><b>01</b>大会と募集の設定</li><li><b>02</b>受付・チームの管理</li><li><b>03</b>対戦と進行の準備</li></ol></aside>
            <Card className="admin-login-card w-full relative overflow-hidden">

                <div className="admin-login-title relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Lock className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="admin-eyebrow">ADMINISTRATION / 管理者専用</p><h1 className="text-2xl font-bold text-white tracking-tight">管理者ログイン</h1>
                    <p className="text-sm text-slate-400 mt-2">管理者用パスワードを入力してください</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-login-form space-y-6 relative z-10">
                    <div className="space-y-2">
                        <Input
                            label="管理者パスワード"
                            autoComplete="current-password"
                            disabled={isLoading}
                            required
                            type="password"
                            placeholder="管理者パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-950/80 border-slate-800 h-12 text-center text-lg tracking-widest focus-visible:ring-indigo-500"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div role="alert" className="text-sm text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoading || !password}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2">ログイン <ArrowRight className="w-4 h-4" /></span>}
                    </Button>
                </form>
                <div className="admin-login-foot"><span>VANKY CUP / ADMIN DESK</span><Link href="/">トップページへ戻る</Link></div>
            </Card>
        </div>
    );
}
