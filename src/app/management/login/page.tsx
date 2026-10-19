"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { CupMark } from "@/components/entry/CupMark";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export default function ManagementLoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/management/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                // A new/cleared HttpOnly staff session must be checked on a fresh document.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/management";
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
        <main id="operations-main" className="operations-workspace operations-login" tabIndex={-1}>
            <aside className="operations-login-poster"><div><span>VANKY CUP / CREW ENTRANCE</span><CupMark /><h2>いい一日を、<br />コートの裏側から。</h2><p>チームの受付、会計、選手情報。<br />大会を支える準備を、ここから。</p></div><ol><li><b>01</b>受付状況を確認</li><li><b>02</b>連絡・入金をチェック</li><li><b>03</b>必要な書類を準備</li></ol></aside>
            <Card className="operations-login-card">
                <div className="operations-login-title"><span>OPERATIONS / STAFF ACCESS</span><Lock size={24} aria-hidden="true" /><h1>運営スタッフログイン</h1><p>運営チーム用パスワードを入力してください。</p></div>
                <form onSubmit={handleSubmit} aria-busy={isLoading}><fieldset disabled={isLoading} className="space-y-6 operations-login-form">
                    <div className="space-y-2">
                        <Input
                            label="運営用パスワード"
                            autoComplete="current-password"
                            type="password"
                            required
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-950/80 border-slate-800 h-12 text-center text-lg tracking-widest focus-visible:ring-emerald-500"
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
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                    >
                        {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />ログイン中…</> : <span className="flex items-center gap-2">ログイン <ArrowRight className="w-4 h-4" /></span>}
                    </Button>
                </fieldset></form>
                <div className="operations-login-foot"><span>STAFF ONLY</span><Link href="/">参加者トップへ戻る</Link></div>
            </Card>
        </main>
    );
}
