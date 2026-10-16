"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, Suspense } from "react";
import { CupMark } from "@/components/entry/CupMark";
import { ParticipantHeader, ParticipantFormTitle, ParticipantState } from "@/components/participant/ParticipantFrame";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch('/api/team/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Mock Session: Save user to localStorage
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                setError(data.message || "ログインに失敗しました");
            }
        } catch {
            setError("サーバーエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <ParticipantHeader backHref="/" backLabel="トップへ戻る" />
            <main className="participant-form-page">
            <div className="participant-form-layout">
                <aside className="participant-form-aside">
                    <div className="participant-form-intro">
                        <p className="participant-eyebrow">TEAM DESK / VANKYCUP</p>
                        <h2 className="text-[38px] font-bold leading-relaxed tracking-tight">コートに立つまでの<br />準備は、ここから。</h2>
                        <p>大会への申し込み後は、代表者のアカウントでチームを管理できます。</p>
                        <div className="participant-guide"><h2>マイページでできること</h2><ol>
                            <li><div><h3>申し込み内容を確認</h3><p>参加する大会とチームの登録状況を確認できます。</p></div></li>
                            <li><div><h3>メンバーを登録</h3><p>名前やリストバンド、保険の情報をまとめて管理できます。</p></div></li>
                            <li><div><h3>必要な書類を保存</h3><p>参加費の請求書や、発行可能な領収書を確認できます。</p></div></li>
                        </ol></div>
                        <CupMark className="participant-mark" />
                    </div>
                </aside>
                <Card className="participant-form-card">
                    <ParticipantFormTitle eyebrow="REPRESENTATIVE LOGIN" title="代表者ログイン" description="登録したメールアドレスとパスワードを入力してください。" />
                    <div className="participant-form-content">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div
                                role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"
                            >
                                <span className="block w-2 h-2 rounded-full bg-red-400/50"></span>
                                {error}
                            </div>
                        )}

                        <Input
                            id="login-email"
                            label="メールアドレス"
                            autoComplete="username"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="login-password" className="text-sm font-medium text-[#e4e8ef] tracking-wide">パスワード</label>
                                <Link href="/login/reset" className="text-xs text-[#ffb2be] hover:text-[#ffb2be] transition-colors">
                                    パスワードを忘れた場合
                                </Link>
                            </div>
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full mt-8"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> ログイン中...
                                </>
                            ) : (
                                <>
                                    ログイン <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#707b8c] text-center">
                        <p className="text-sm text-[#c6cdd8]">
                            アカウントをお持ちでない場合は{" "}
                            <Link href="/team/register" className="text-[#ffb2be] hover:text-[#ffb2be] font-medium transition-colors">
                                新規登録
                            </Link>
                        </p>
                    </div>
                    </div>
                </Card>
            </div>
            </main>
        </>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<ParticipantState title="ログイン画面を準備しています" loading />}>
            <LoginContent />
        </Suspense>
    );
}
