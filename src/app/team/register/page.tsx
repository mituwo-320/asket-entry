"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        nameKana: "", // NEW
        introduction: "", // NEW
        isBeginnerFriendlyAccepted: false, // NEW
        representative: "",
        furigana: "",
        email: "",
        phone: "",
        postalCode: "",
        address: "",
        wristbandColor: "赤",
        insurance: true,
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("パスワードが一致しません");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/team/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    teamNameKana: formData.nameKana, // NEW
                    teamIntroduction: formData.introduction, // NEW
                    isBeginnerFriendlyAccepted: formData.isBeginnerFriendlyAccepted, // NEW
                    representative: formData.representative,
                    furigana: formData.furigana,
                    email: formData.email,
                    phone: formData.phone,
                    postalCode: formData.postalCode,
                    address: formData.address,
                    wristbandColor: formData.wristbandColor,
                    insurance: formData.insurance,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "登録に失敗しました");
            }

            setTeamId(data.teamId);
            setRegisteredEmail(formData.email);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (teamId) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans selection:bg-indigo-500/30">
                {/* Background Effects */}
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
                            <h2 className="text-2xl font-bold text-white mb-2">登録完了！</h2>
                            <p className="text-slate-400">アカウントが作成されました。<br />メールアドレスでログインしてください。</p>
                        </div>

                        <div className="bg-slate-950 rounded-lg p-6 border border-slate-800 space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">ログインID (メールアドレス)</p>
                                <p className="text-lg font-mono font-bold text-indigo-400 tracking-wider">{registeredEmail}</p>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-6 shadow-lg shadow-indigo-500/20 transition-all duration-300"
                            onClick={() => router.push("/login")}
                        >
                            ログイン画面へ
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md p-8 bg-slate-900/80 border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl">
                <div className="mb-8">
                    <Link href="/team" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        戻る
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            新規エントリー
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm pl-11">
                        大会への参加申し込みを行います。<br />
                        登録後、すぐにマイページをご利用いただけます。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">チーム情報</label>
                            <Input
                                placeholder="チーム名"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <p className="text-[10px] text-slate-500 px-1">※ チーム名は後から変更可能です</p>
                            <Input
                                placeholder="チーム名 (フリガナ)"
                                value={formData.nameKana}
                                onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                                required
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <Input
                                placeholder="代表者氏名"
                                value={formData.representative}
                                onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                                required
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <Input
                                placeholder="代表者氏名 (フリガナ)"
                                value={formData.furigana}
                                onChange={(e) => setFormData({ ...formData, furigana: e.target.value })}
                                required
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">連絡先 & 住所</label>
                            <Input
                                type="email"
                                placeholder="メールアドレス"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <Input
                                type="tel"
                                placeholder="電話番号 (緊急連絡先)"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <div className="space-y-2">
                                <Input
                                    placeholder="郵便番号"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    className="w-1/3 bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                                <Input
                                    placeholder="住所 (任意)"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">スポーツ保険の加入状況</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option 1: Join Insurance */}
                                <div
                                    onClick={() => setFormData({ ...formData, insurance: true })}
                                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${formData.insurance
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                        }`}
                                >
                                    {formData.insurance && (
                                        <div className="absolute top-3 right-3 text-emerald-500">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-2 w-fit rounded-lg ${formData.insurance ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${formData.insurance ? "text-emerald-400" : "text-slate-300"}`}>大会保険に加入</h3>
                                            <p className="text-xs text-slate-400 mt-1">大会が指定するスポ―ツ保険に加入します (推奨)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Self Insured */}
                                <div
                                    onClick={() => setFormData({ ...formData, insurance: false })}
                                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${!formData.insurance
                                        ? "border-slate-500 bg-slate-800"
                                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                        }`}
                                >
                                    {!formData.insurance && (
                                        <div className="absolute top-3 right-3 text-slate-400">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-2 w-fit rounded-lg ${!formData.insurance ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                                            <UserCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${!formData.insurance ? "text-slate-200" : "text-slate-300"}`}>加入しない</h3>
                                            <p className="text-xs text-slate-400 mt-1">各自で保険に加入済み、または加入を希望しません</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">代表者のリストバンド色</label>
                            <div className="grid grid-cols-1 gap-2">
                                <p className="text-xs text-slate-500 mb-1">
                                    ※ 試合中の識別に使用します。ご自身の経験に合わせて選択してください。
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { color: "赤", label: "赤 (経験5年以上)", desc: "上級者" },
                                        { color: "青", label: "青 (2〜5年)", desc: "中級者" },
                                        { color: "黄", label: "黄 (2年未満)", desc: "初心者" }
                                    ].map((opt) => (
                                        <div
                                            key={opt.color}
                                            onClick={() => setFormData({ ...formData, wristbandColor: opt.color })}
                                            className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${formData.wristbandColor === opt.color
                                                ? `border-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-500 bg-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-500/10`
                                                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                                }`}
                                        >
                                            <div className={`font-bold ${formData.wristbandColor === opt.color
                                                ? `text-${opt.color === '赤' ? 'red' : opt.color === '青' ? 'blue' : 'yellow'}-400`
                                                : "text-slate-300"
                                                }`}>{opt.color}</div>
                                            <div className="text-[10px] text-slate-500">{opt.desc}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 pl-2 border-l-2 border-slate-800">
                                    <div><span className="text-red-400 font-bold">赤</span>: 学生時代バスケ経験 5年以上</div>
                                    <div><span className="text-blue-400 font-bold">青</span>: 学生時代バスケ経験 2年超 5年未満</div>
                                    <div><span className="text-yellow-400 font-bold">黄</span>: 学生時代バスケ経験 2年以下 (初心者など)</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">チーム紹介・意気込み</label>
                            <textarea
                                placeholder="今回のチームの特徴並びに意気込み等ご記入ください。（開会式でのチーム紹介に活用させていただきます。できる限りご記入をお願いいたします。）"
                                value={formData.introduction}
                                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                                required
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-md p-3 min-h-[120px] focus:border-indigo-500/50 focus:ring-indigo-500/20 text-sm"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-start space-x-3 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="beginnerFriendly"
                                    checked={formData.isBeginnerFriendlyAccepted}
                                    onChange={(e) => setFormData({ ...formData, isBeginnerFriendlyAccepted: e.target.checked })}
                                    required
                                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
                                />
                                <label htmlFor="beginnerFriendly" className="text-sm text-slate-300 cursor-pointer">
                                    ヴァンキーカップは初心者が楽しめる大会であることを理解してエントリーをする。
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">ログイン設定</label>
                            <Input
                                type="password"
                                placeholder="パスワード (PIN)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11"
                            />
                            <Input
                                type="password"
                                placeholder="パスワード (確認用)"
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
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 登録中...</>
                        ) : (
                            "上記の内容でエントリーする"
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
