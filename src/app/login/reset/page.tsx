"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParticipantHeader, ParticipantFormTitle, ParticipantFormFooter } from "@/components/participant/ParticipantFrame";
import { ParticipantPassword, ParticipantAccountNote, ParticipantResetProgress } from "@/components/participant/ParticipantPassword";
import { ParticipantStory } from "@/components/participant/ParticipantStory";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const successHeading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { if (isSuccess) successHeading.current?.focus(); }, [isSuccess]);

    // Form states
    const [email, setEmail] = useState(emailParam || "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Identify which step we are on
    const isConfirming = !!(token && emailParam);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "通信に失敗しました。時間をおいて、もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "通信に失敗しました。時間をおいて、もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess && !isConfirming) {
        return (
            <div className="participant-form-content participant-auth-complete text-center space-y-6">
                <div className="w-16 h-16 bg-[#c52d40]/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <Mail aria-hidden="true" className="w-8 h-8 text-[#ffb2be]" />
                </div>
                <div>
                    <ParticipantResetProgress step={2} />
                    <h1 ref={successHeading} tabIndex={-1} className="text-2xl font-bold text-[#f7f7f5] mb-2">受信トレイをご確認ください</h1>
                    <p className="text-[#c6cdd8] text-sm">
                        登録済みのアドレスに、再設定用のリンクをお送りします。<br />
                        届いたメールのリンクを開いて、新しいパスワードを設定してください。
                    </p>
                </div>
                <div className="participant-auth-address"><span>入力したメールアドレス</span><p>{email}</p></div>
                <ParticipantAccountNote title="メールが見つからないとき"><p>迷惑メールフォルダも確認してください。届かない場合は、申し込み時のアドレスをご確認ください。</p><button type="button" onClick={() => { setIsSuccess(false); setError(""); }}>メールアドレスを確認し直す</button></ParticipantAccountNote>
                <Button
                    className="w-full bg-[#343b47] hover:bg-[#343b47] text-[#f7f7f5] font-medium py-6 transition-all duration-300"
                    onClick={() => router.push(`/login?email=${encodeURIComponent(isConfirming ? emailParam || "" : email)}`)}
                >
                    ログイン画面へ戻る
                </Button>
            </div>
        );
    }

    if (isSuccess && isConfirming) {
        return (
            <div className="participant-form-content participant-auth-complete text-center space-y-6">
                <div className="w-16 h-16 bg-[#c52d40]/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-orange-500/20">
                    <CheckCircle2 aria-hidden="true" className="w-8 h-8 text-[#ffb2be]" />
                </div>
                <div>
                    <p className="participant-auth-stamp">RESET COMPLETE</p><h1 ref={successHeading} tabIndex={-1} className="text-2xl font-bold text-[#f7f7f5] mb-2">再設定が完了しました</h1>
                    <p className="text-[#c6cdd8] text-sm">
                        パスワードの再設定が完了しました。<br />
                        新しいパスワードでログインしてください。
                    </p>
                </div>
                <Button
                    className="w-full bg-[#c52d40] hover:bg-[#ad1d31] text-white font-medium py-6 shadow-none transition-all duration-300"
                    onClick={() => router.push(`/login?email=${encodeURIComponent(isConfirming ? emailParam || "" : email)}`)}
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
            <ParticipantResetProgress step={isConfirming ? 3 : 1} />
            <form onSubmit={isConfirming ? handleConfirmReset : handleRequestReset} aria-busy={isLoading}><fieldset disabled={isLoading} className="space-y-6 participant-auth-fields">
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
                            className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
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
                                className="bg-[#242830] border-[#707b8c] text-[#c6cdd8] h-11"
                            />
                        </div>
                        <div className="space-y-2 pt-2">

                            <ParticipantPassword
                                hint="4文字以上で設定してください。"
                                label="新しいパスワード"
                                autoComplete="new-password"
                                placeholder="新しいパスワード"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                            <ParticipantPassword
                                label="新しいパスワード（確認）"
                                autoComplete="new-password"
                                placeholder="新しいパスワード (確認用)"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-[#15171d] border-[#707b8c] focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div role="alert" className="participant-feedback participant-feedback-error">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full bg-[#c52d40] hover:bg-[#ad1d31] text-white font-medium py-6 shadow-none transition-all duration-300"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 処理中...</>
                    ) : (
                        isConfirming ? "パスワードを再設定する" : "再設定リンクを送信する"
                    )}
                </Button>
            </fieldset></form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <>
            <ParticipantHeader backHref="/login" backLabel="ログインへ戻る" />
            <main id="participant-main" tabIndex={-1} className="participant-form-page">
              <div className="participant-form-layout">
                <ParticipantStory eyebrow="BACK TO YOUR TEAM." title={<>もう一度、<br />チームのもとへ。</>} description="ログインできないときは、登録したメールアドレスからパスワードを再設定できます。" guideTitle="再設定の流れ" steps={[
                    { title: "メールアドレスを入力", description: "チームの申し込みに使ったアドレスを入力。" },
                    { title: "メールのリンクを開く", description: "受信トレイに届いた再設定リンクから進みます。" },
                    { title: "新しいパスワードで再開", description: "設定が終わったら、ログイン画面へ。" },
                ]} />
                <Card className="participant-form-card">
                    <Suspense fallback={<div className="participant-form-content text-center py-12"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-4" />読み込み中…</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                    <ParticipantFormFooter />
                </Card>
              </div>
            </main>
        </>
    );
}
