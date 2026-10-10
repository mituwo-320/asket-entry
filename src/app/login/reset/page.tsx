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
                <div className="w-16 h-16 bg-[#f18a5c]/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <Mail className="w-8 h-8 text-[#f18a5c]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#f3f0e8] mb-2">メールを送信しました</h2>
                    <p className="text-[#b6b8ad] text-sm">
                        入力されたメールアドレスにパスワード再設定用のリンクを送信しました。<br />
                        受信トレイをご確認いただき、リンクから再設定を行ってください。
                    </p>
                </div>
                <Button
                    className="w-full bg-[#353731] hover:bg-[#353731] text-[#f3f0e8] font-medium py-6 transition-all duration-300"
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
                <div className="w-16 h-16 bg-[#f18a5c]/100/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <CheckCircle2 className="w-8 h-8 text-[#f18a5c]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#f3f0e8] mb-2">再設定完了</h2>
                    <p className="text-[#b6b8ad] text-sm">
                        パスワードの再設定が完了しました。<br />
                        新しいパスワードでログインしてください。
                    </p>
                </div>
                <Button
                    className="w-full bg-[#f18a5c] hover:bg-[#f6a078] text-white font-medium py-6 shadow-none transition-all duration-300"
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
                <Link href="/login" className="inline-flex items-center text-sm text-[#b6b8ad] hover:text-[#f3f0e8] transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    戻る
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#f18a5c]/10 rounded-lg">
                        <KeyRound className="w-6 h-6 text-[#f18a5c]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#f3f0e8]">
                        パスワード再設定
                    </h1>
                </div>
                <p className="text-[#b6b8ad] text-sm pl-11">
                    {isConfirming
                        ? "新しいパスワードを入力してください。"
                        : "登録しているメールアドレスを入力してください。パスワード再設定用のリンクを送信します。"}
                </p>
            </div>

            <form onSubmit={isConfirming ? handleConfirmReset : handleRequestReset} className="space-y-6">
                {!isConfirming ? (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">メールアドレス</label>
                        <Input
                            type="email"
                            placeholder="登録メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">対象のアカウント</label>
                            <Input
                                type="email"
                                value={emailParam || ""}
                                disabled
                                className="bg-[#292b28] border-[#454740] text-[#b6b8ad] h-11"
                            />
                        </div>
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-medium text-[#b6b8ad] uppercase tracking-wider ml-1">新しいパスワード</label>
                            <Input
                                type="password"
                                placeholder="新しいパスワード"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                            <Input
                                type="password"
                                placeholder="新しいパスワード (確認用)"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-[#20211f] border-[#454740] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
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
                    className="w-full bg-[#f18a5c] hover:bg-[#f6a078] text-white font-medium py-6 shadow-none transition-all duration-300"
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
        <div className="entry-form-screen min-h-screen flex flex-col items-center justify-center p-4 text-[#d9dace] font-sans selection:bg-[#f18a5c]/30">

            <div
                className="w-full max-w-md relative z-10"
            >
                <Card className="p-8 bg-[#292b28] border-[#454740]  shadow-none">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-[#f18a5c] animate-spin" />
                            <p className="text-[#b6b8ad] mt-4 text-sm">読み込み中...</p>
                        </div>
                    }>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </div>
        </div>
    );
}
