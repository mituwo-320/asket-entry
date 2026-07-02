"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2, Save, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TeamEntry, User, Player } from "@/lib/types";

function EditTeamContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const entryId = searchParams.get('id');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [projectEndDate, setProjectEndDate] = useState<string | null>(null);

    const [tournamentId, setTournamentId] = useState("");
    const [hasClinic, setHasClinic] = useState(false);
    const [clinicTitle, setClinicTitle] = useState("");
    const [clinicDescription, setClinicDescription] = useState("");
    const [clinicLimit, setClinicLimit] = useState(20);
    const [formData, setFormData] = useState({
        // Team
        teamName: "",
        teamNameKana: "",
        teamIntroduction: "",
        // Representative (User)
        representativeName: "",
        phone: "",
        // Representative (Player)
        repFurigana: "",
        wristbandColor: "赤",
        insurance: false,
        // Clinic
        clinicParticipation: null as boolean | null,
        clinicCount: 0,
    });

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setIsSettingsLoaded(true);
            })
            .catch(() => setIsSettingsLoaded(true));
    }, []);

    useEffect(() => {
        if (!entryId) return;

        const fetchData = async () => {
            try {
                const res = await fetch('/api/team/data', {
                    headers: { 'x-team-id': entryId }
                });

                if (!res.ok) throw new Error("Failed to fetch data");

                const data = await res.json();
                const team: TeamEntry = data.teamEntry;
                setTournamentId(team.tournamentId);
                setHasClinic((team as any).hasClinic || false);
                setClinicTitle((team as any).clinicTitle || "");
                setClinicDescription((team as any).clinicDescription || "");
                setClinicLimit((team as any).clinicLimit !== undefined ? (team as any).clinicLimit : 20);
                setProjectEndDate((team as any).projectEndDate || null);
                const user: User | undefined = data.user;
                const repPlayer = team.players.find(p => p.isRepresentative) || team.players[0];

                setFormData({
                    teamName: team.teamName,
                    teamNameKana: team.teamNameKana || "",
                    teamIntroduction: team.teamIntroduction || "",
                    representativeName: repPlayer.name,
                    phone: "",
                    repFurigana: repPlayer.furigana,
                    wristbandColor: repPlayer.wristbandColor || "赤",
                    insurance: repPlayer.insurance,
                    clinicParticipation: (team as any).clinicParticipation !== undefined && (team as any).clinicParticipation !== null ? (team as any).clinicParticipation : null,
                    clinicCount: (team as any).clinicCount || 0,
                });

                if ((data as any).user) {
                    const u = (data as any).user as User;
                    setFormData(prev => ({
                        ...prev,
                        phone: u.phone,
                        // Note: User name and Player name should be synced.
                    }));
                }

            } catch (e) {
                console.error(e);
                setError("データの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [entryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError("");
        setSuccessMsg("");
        if (hasClinic && formData.clinicParticipation === null) {
            setError(`${clinicTitle || 'バスケクリニック'}の参加・不参加を選択してください`);
            setIsSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/team/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-team-id': entryId || ''
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Update failed");

            setSuccessMsg("保存しました");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (e) {
            setError("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !isSettingsLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
    if (!entryId) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Invalid ID</div>;

    if (projectEndDate && new Date() > new Date(projectEndDate)) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
                <Card className="w-full max-w-md p-8 bg-slate-900/80 border-slate-800 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white">エントリー・編集期間終了</h2>
                    <p className="text-slate-400">誠に申し訳ありませんが、本大会の編集受付期間は終了いたしました。</p>
                    <Button onClick={() => router.push(`/team/dashboard?id=${entryId}`)} className="w-full mt-4 bg-slate-800 hover:bg-slate-700">ダッシュボードへ戻る</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/team/dashboard?id=${entryId}`} className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">チーム設定</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Card className="bg-slate-900 border-slate-800 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Team Info */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">チーム情報</h2>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">チーム名</label>
                                <Input
                                    value={formData.teamName}
                                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">チーム名 (フリガナ)</label>
                                <Input
                                    value={formData.teamNameKana}
                                    onChange={(e) => setFormData({ ...formData, teamNameKana: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">チーム紹介・意気込み</label>
                                <textarea
                                    value={formData.teamIntroduction}
                                    onChange={(e) => setFormData({ ...formData, teamIntroduction: e.target.value })}
                                    required
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-md p-3 min-h-[100px] focus:border-indigo-500/50 focus:ring-indigo-500/20 text-sm text-slate-200"
                                />
                            </div>

                            {hasClinic && (
                                <div className="space-y-4 p-5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
                                    <label className="text-sm font-extrabold text-indigo-300 flex items-center gap-2">
                                        {clinicTitle || '🏀 バスケクリニックへの参加希望'}
                                    </label>
                                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                                        {clinicDescription}
                                    </p>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-200">
                                            <input
                                                type="radio"
                                                name="clinicParticipation"
                                                checked={formData.clinicParticipation === true}
                                                onChange={() => setFormData({ ...formData, clinicParticipation: true, clinicCount: 1 })}
                                                className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500"
                                            />
                                            クリニックに参加する
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-200">
                                            <input
                                                type="radio"
                                                name="clinicParticipation"
                                                checked={formData.clinicParticipation === false}
                                                onChange={() => setFormData({ ...formData, clinicParticipation: false, clinicCount: 0 })}
                                                className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500"
                                            />
                                            参加しない
                                        </label>
                                    </div>
                                    {formData.clinicParticipation && (
                                        <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="text-xs font-bold text-slate-400">参加予定人数</label>
                                            <select
                                                value={formData.clinicCount}
                                                onChange={(e) => setFormData({ ...formData, clinicCount: parseInt(e.target.value, 10) })}
                                                className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none font-sans"
                                            >
                                                {Array.from({ length: clinicLimit }, (_, i) => i + 1).map((n) => (
                                                    <option key={n} value={n}>
                                                        {n} 名
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Representative Info */}
                        <div className="space-y-4 pt-4">
                            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">代表者情報</h2>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">代表者氏名</label>
                                <Input
                                    value={formData.representativeName}
                                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">代表者氏名 (フリガナ)</label>
                                <Input
                                    value={formData.repFurigana}
                                    onChange={(e) => setFormData({ ...formData, repFurigana: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">電話番号</label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="bg-slate-950/50 border-slate-800"
                                />
                            </div>
                        </div>


                        {successMsg && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> {successMsg}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 min-w-[120px]">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> 保存</>}
                            </Button>
                        </div>

                    </form>
                </Card>
            </main>
        </div>
    );
}

export default function EditTeamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
            <EditTeamContent />
        </Suspense>
    );
}
