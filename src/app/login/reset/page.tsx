"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParticipantHeader, ParticipantFormTitle } from "@/components/participant/ParticipantFrame";

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
            <div className="participant-form-content text-center space-y-6">
                <div className="w-16 h-16 bg-[#f18a5c]/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <Mail className="w-8 h-8 text-[#f18a5c]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#f3f0e8] mb-2">メールを送信しました</h2>
                    <p className="text-[#c2cbb5] text-sm">
                        入力されたメールアドレスにパスワード再設定用のリンクを送信しました。<br />
                        受信トレイをご確認いただき、リンクから再設定を行ってください。
                    </p>
                </div>
                <Button
                    className="w-full bg-[#3a4a30] hover:bg-[#3a4a30] text-[#f3f0e8] font-medium py-6 transition-all duration-300"
                    onClick={() => router.push("/login")}
                >
                    ログイン画面へ戻る
                </Button>
            </div>
        );
    }

    if (isSuccess && isConfirming) {
        return (
            <div className="participant-form-content text-center space-y-6">
                <div className="w-16 h-16 bg-[#f18a5c]/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <CheckCircle2 className="w-8 h-8 text-[#f18a5c]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#f3f0e8] mb-2">再設定完了</h2>
                    <p className="text-[#c2cbb5] text-sm">
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
            <ParticipantFormTitle eyebrow="ACCOUNT SUPPORT" title="パスワード再設定" description={isConfirming ? "新しいパスワードを入力してください。" : "登録したメールアドレスに、再設定用のリンクをお送りします。"} />
            <div className="participant-form-content">
            <form onSubmit={isConfirming ? handleConfirmReset : handleRequestReset} className="space-y-6">
                {!isConfirming ? (
                    <div className="space-y-2">

                        <Input
                            label="メールアドレス"
                            autoComplete="email"
                            type="email"
                            placeholder="登録メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-[#1c291b] border-[#778867] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">

                            <Input
                                label="対象のアカウント"
                                type="email"
                                value={emailParam || ""}
                                disabled
                                className="bg-[#283722] border-[#778867] text-[#c2cbb5] h-11"
                            />
                        </div>
                        <div className="space-y-2 pt-2">

                            <Input
                                label="新しいパスワード"
                                autoComplete="new-password"
                                type="password"
                                placeholder="新しいパスワード"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="bg-[#1c291b] border-[#778867] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                            <Input
                                label="新しいパスワード（確認）"
                                autoComplete="new-password"
                                type="password"
                                placeholder="新しいパスワード (確認用)"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-[#1c291b] border-[#778867] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
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
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <>
            <ParticipantHeader backHref="/login" backLabel="ログインへ戻る" />
            <main className="participant-main participant-main-narrow">
                <Card className="participant-form-card">
                    <Suspense fallback={<div className="participant-form-content text-center py-12"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-4" />読み込み中…</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </main>
        </>
    );
}
