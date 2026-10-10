"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, CheckCircle2, Loader2, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    // Form states
    const [email, setEmail] = useState(emailParam || "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Identify which step we are on
    const isConfirming = !!(token && emailParam);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "リクエストに失敗しました");

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("新しいパスワードが一致しません");
            return;
        }

        if (newPassword.length < 4) {
            setError("パスワードは4文字以上で設定してください");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: emailParam,
                    token,
                    newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "パスワードの再設定に失敗しました");

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess && !isConfirming) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
                    <Mail className="w-8 h-8 text-emerald-800" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">メールを送信しました</h2>
                    <p className="text-stone-600 text-sm">
                        入力されたメールアドレスにパスワード再設定用のリンクを送信しました。<br />
                        受信トレイをご確認いただき、リンクから再設定を行ってください。
                    </p>
                </div>
                <Button
                    className="w-full bg-stone-100 hover:bg-stone-100 text-stone-900 font-medium py-6 transition-all duration-300"
                    onClick={() => router.push("/login")}
                >
                    ログイン画面へ戻る
                </Button>
            </div>
        );
    }

    if (isSuccess && isConfirming) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-800" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">再設定完了</h2>
                    <p className="text-stone-600 text-sm">
                        パスワードの再設定が完了しました。<br />
                        新しいパスワードでログインしてください。
                    </p>
                </div>
                <Button
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-6 shadow-none transition-all duration-300"
                    onClick={() => router.push("/login")}
                >
                    ログイン画面へ戻る
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-8">
                <Link href="/login" className="inline-flex items-center text-sm text-stone-600 hover:text-stone-900 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    戻る
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <KeyRound className="w-6 h-6 text-emerald-800" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900">
                        パスワード再設定
                    </h1>
                </div>
                <p className="text-stone-600 text-sm pl-11">
                    {isConfirming
                        ? "新しいパスワードを入力してください。"
                        : "登録しているメールアドレスを入力してください。パスワード再設定用のリンクを送信します。"}
                </p>
            </div>

            <form onSubmit={isConfirming ? handleConfirmReset : handleRequestReset} className="space-y-6">
                {!isConfirming ? (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">メールアドレス</label>
                        <Input
                            type="email"
                            placeholder="登録メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-stone-50 border-stone-200 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">対象のアカウント</label>
                            <Input
                                type="email"
                                value={emailParam || ""}
                                disabled
                                className="bg-white border-stone-200 text-stone-600 h-11"
                            />
                        </div>
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">新しいパスワード</label>
                            <Input
                                type="password"
                                placeholder="新しいパスワード"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="bg-stone-50 border-stone-200 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11"
                            />
                            <Input
                                type="password"
                                placeholder="新しいパスワード (確認用)"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-stone-50 border-stone-200 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-6 shadow-none transition-all duration-300"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 処理中...</>
                    ) : (
                        isConfirming ? "パスワードを再設定する" : "再設定リンクを送信する"
                    )}
                </Button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-stone-800 font-sans selection:bg-emerald-800/30">

            <div
                className="w-full max-w-md relative z-10"
            >
                <Card className="p-8 bg-white border-stone-200  shadow-none">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
                            <p className="text-stone-600 mt-4 text-sm">読み込み中...</p>
                        </div>
                    }>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </div>
        </div>
    );
}
