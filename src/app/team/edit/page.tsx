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
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        // Team
        teamName: "",
        teamNameKana: "",
        teamIntroduction: "",
        // Representative (User)
        representativeName: "",
        phone: "",
        postalCode: "",
        address: "",
        // Representative (Player)
        repFurigana: "",
        wristbandColor: "赤",
        insurance: false,
    });

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
                const user: User | undefined = data.user; // We might need to fetch user separately or API/team/data returns it?
                // Checking api/team/data/route.ts -> it returns { teamEntry: ... } only. 
                // We need the User object too. But api/team/data usually finds entry by userId if no header?
                // Actually, let's look at api/team/data... 
                // It fetches via userId from session or x-team-id.
                // It currently only returns `teamEntry`. 
                // AND the rep player is the first player in `teamEntry.players`.
                // BUT User object has phone/address/email/postalCode. TeamEntry doesn't have address.

                // CRITICAL: We need the User object to edit phone/address.
                // `api/team/data` might need to be updated to return User, or we fetch it here.
                // However, since we are in a hurry, I will Implement a fetch strategy.
                // `teamEntry.userId` gives us the user ID.

                // Actually, the `User` object is NOT returned by default `api/team/data`.
                // Let's assume for now we can get the Rep Player data from `teamEntry`.
                // The User specific data (Address/Phone) is in `User` object.
                // For this task, "Edit Team Information", usually implies Team info. 
                // User asked "Team name etc representative edit function". which implies rep fields.
                // If `api/team/data` doesn't return User, we might need to update it or create `api/team/update` to handle fetching too?
                // No, better to update `api/team/data` to return user if needed.
                // Let's check `api/team/data` first. 

                // Wait, I can't check it right now inside this tool call.
                // I will code this optimistically assuming I will update `api/team/data` to return `user` object as well, 
                // OR I will fetch it in a separate call if needed.
                // Update: I will update `api/team/data` in the next step to return `user` as well.

                const repPlayer = team.players.find(p => p.isRepresentative) || team.players[0];

                setFormData({
                    teamName: team.teamName,
                    teamNameKana: team.teamNameKana || "",
                    teamIntroduction: team.teamIntroduction || "",
                    representativeName: repPlayer.name, // Edit Rep Name on Player
                    phone: "", // Will be filled if API returns user
                    postalCode: "",
                    address: "",
                    repFurigana: repPlayer.furigana,
                    wristbandColor: repPlayer.wristbandColor || "赤",
                    insurance: repPlayer.insurance,
                });

                // If API returns user data (I will ensure this next)
                if ((data as any).user) {
                    const u = (data as any).user as User;
                    setFormData(prev => ({
                        ...prev,
                        phone: u.phone,
                        postalCode: u.postalCode || "",
                        address: u.address || "",
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

    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    if (!entryId) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Invalid ID</div>;

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

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <label className="text-sm font-medium text-slate-400">郵便番号</label>
                                        <Input
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                            className="bg-slate-950/50 border-slate-800"
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="text-sm font-medium text-slate-400">住所</label>
                                        <Input
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="bg-slate-950/50 border-slate-800"
                                        />
                                    </div>
                                </div>
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
