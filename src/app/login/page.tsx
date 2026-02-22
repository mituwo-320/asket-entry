"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Trophy, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("demo@test.com"); // Pre-fill for demo
    const [password, setPassword] = useState("pass");    // Pre-fill for demo
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

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
        } catch (err) {
            setError("サーバーエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md space-y-8"
            >
                {/* Logo / Header */}
                <div className="text-center">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-indigo-500/30 border border-indigo-400/20"
                    >
                        <Trophy className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-slate-400 text-sm">アカウントにログインして大会に参加</p>
                </div>

                <Card className="p-8 sm:p-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
                            >
                                <span className="block w-2 h-2 rounded-full bg-red-400/50"></span>
                                {error}
                            </motion.div>
                        )}

                        <Input
                            label="メールアドレス"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300 tracking-wide">パスワード</label>
                                <Link href="/login/reset" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                    パスワードを忘れた場合
                                </Link>
                            </div>
                            <Input
                                type="password"
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

                    <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                        <p className="text-sm text-slate-400">
                            アカウントをお持ちでない場合は{" "}
                            <Link href="/team/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                新規登録
                            </Link>
                        </p>
                    </div>
                </Card>
            </motion.div>

            <div className="mt-12 text-center text-xs text-slate-500 font-medium">
                &copy; {new Date().getFullYear()} BasketEntry. All rights reserved.
            </div>
        </div>
    );
}
