"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        } catch (e) {
            setError("通信エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 bg-slate-900/80 border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Lock className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
                    <p className="text-sm text-slate-400 mt-2">管理者用パスワードを入力してください</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="管理者パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-950/80 border-slate-800 h-12 text-center text-lg tracking-widest focus-visible:ring-indigo-500"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
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
            </Card>
        </div>
    );
}
