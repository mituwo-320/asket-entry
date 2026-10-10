"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, Suspense } from "react";

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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
            <div
                className="w-full max-w-md space-y-8"
            >
                {/* Logo / Header */}
                <div className="text-center">
                    <Link href="/" className="entry-brand mb-6 inline-block">vankycup</Link>
                    <h1 className="text-2xl font-bold text-[#f3f0e8] tracking-tight mb-2">チーム代表者ログイン</h1>
                    <p className="text-[#b6b8ad] text-sm">登録内容の確認や、メンバーの追加ができます。</p>
                </div>

                <Card className="p-8 sm:p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div
                                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"
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
                                <label htmlFor="login-password" className="text-sm font-medium text-[#d9dace] tracking-wide">パスワード</label>
                                <Link href="/login/reset" className="text-xs text-[#f18a5c] hover:text-[#f18a5c] transition-colors">
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

                    <div className="mt-8 pt-6 border-t border-[#454740] text-center">
                        <p className="text-sm text-[#b6b8ad]">
                            アカウントをお持ちでない場合は{" "}
                            <Link href="/team/register" className="text-[#f18a5c] hover:text-[#f18a5c] font-medium transition-colors">
                                新規登録
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>

            <div className="mt-12 text-center text-xs text-[#b6b8ad] font-medium ">
                &copy; {new Date().getFullYear()} vankycup
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="entry-form-screen min-h-screen flex items-center justify-center text-[#f3f0e8]">読み込み中…</div>}>
            <LoginContent />
        </Suspense>
    );
}
