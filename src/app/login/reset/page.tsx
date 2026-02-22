"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        newPassword: "",
        confirmPassword: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.newPassword !== formData.confirmPassword) {
            setError("新しいパスワードが一致しません");
            return;
        }

        if (formData.newPassword.length < 4) {
            setError("パスワードは4文字以上で設定してください");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    phone: formData.phone,
                    newPassword: formData.newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "パスワードの再設定に失敗しました");
            }

            // Success
            setIsSuccess(true);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans selection:bg-indigo-500/30">
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                </div>

                <Card className="w-full max-w-md p-8 bg-slate-900/80 border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">再設定完了</h2>
                            <p className="text-slate-400">パスワードの再設定が完了しました。<br />新しいパスワードでログインしてください。</p>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-6 shadow-lg shadow-indigo-500/20 transition-all duration-300"
                            onClick={() => router.push("/login")}
                        >
                            ログイン画面へ戻る
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans selection:bg-indigo-500/30">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="p-8 bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
                    <div className="mb-8">
                        <Link href="/login" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            戻る
                        </Link>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <KeyRound className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                パスワード再設定
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm pl-11">
                            本人確認のため、登録時に入力した「メールアドレス」と「電話番号」を入力してください。
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">本人確認 (登録情報)</label>
                                <Input
                                    type="email"
                                    placeholder="登録メールアドレス"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                                <Input
                                    type="tel"
                                    placeholder="登録電話番号 (ハイフン有無問わず)"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">新しいパスワード</label>
                                <Input
                                    type="password"
                                    placeholder="新しいパスワード"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                                <Input
                                    type="password"
                                    placeholder="新しいパスワード (確認用)"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-6 shadow-lg shadow-indigo-500/20 transition-all duration-300"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 処理中...</>
                            ) : (
                                "パスワードを再設定する"
                            )}
                        </Button>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
