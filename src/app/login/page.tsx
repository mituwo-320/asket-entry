"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ParticipantHeader, ParticipantFormTitle, ParticipantFormFooter, ParticipantState } from "@/components/participant/ParticipantFrame";
import { ParticipantPassword, ParticipantAccountNote } from "@/components/participant/ParticipantPassword";
import { ParticipantStory } from "@/components/participant/ParticipantStory";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editedEmail, setEmail] = useState<string | null>(null);
    const email = editedEmail ?? searchParams.get("email") ?? "";
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
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
            <main id="participant-main" tabIndex={-1} className="participant-form-page">
            <div className="participant-form-layout">
                <ParticipantStory eyebrow="YOUR TEAM, YOUR COURT." title={<>コートに立つまでの<br />準備は、ここから。</>} description="大会への申し込み後は、代表者のアカウントでチームを管理できます。" guideTitle="マイページでできること" steps={[
                    { title: "参加状況を確認", description: "エントリーした大会と、登録の進み具合を確認。" },
                    { title: "メンバーを登録", description: "選手の名前・リストバンド・保険をまとめて管理。" },
                    { title: "必要な書類を保存", description: "参加費の請求書や、発行できる領収書を確認。" },
                ]} />
                <Card className="participant-form-card">
                    <ParticipantFormTitle eyebrow="REPRESENTATIVE LOGIN" title="代表者ログイン" description="登録したメールアドレスとパスワードを入力してください。" />
                    <div className="participant-form-content">
                    <form onSubmit={handleLogin} aria-busy={isLoading}><fieldset disabled={isLoading} className="space-y-6 participant-auth-fields">
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
                            <div className="participant-password-label-row">
                                <label htmlFor="login-password" className="text-sm font-medium text-[#e4e8ef] tracking-wide">パスワード</label>
                                <Link href={email ? `/login/reset?email=${encodeURIComponent(email)}` : "/login/reset"} className="text-xs text-[#ffb2be] hover:text-[#ffb2be] transition-colors">
                                    パスワードを忘れた場合
                                </Link>
                            </div>
                            <ParticipantPassword
                                id="login-password"
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
                    </fieldset></form>
                    <ParticipantAccountNote title="以前に申し込んだことがある方へ"><p>同じアカウントで別の大会にも申し込めます。まずはログインし、マイページから参加する大会を選んでください。</p></ParticipantAccountNote>

                    <div className="mt-8 pt-6 border-t border-[#707b8c] text-center">
                        <p className="text-sm text-[#c6cdd8]">
                            アカウントをお持ちでない場合は{" "}
                            <Link href="/team/register" className="text-[#ffb2be] hover:text-[#ffb2be] font-medium transition-colors">
                                新規登録
                            </Link>
                        </p>
                    </div>
                    </div>
                    <ParticipantFormFooter />
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
