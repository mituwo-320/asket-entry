"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Users, ShieldCheck, ArrowLeft, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Player, TeamEntry } from "@/lib/types";
import { PlayerForm } from "@/components/ui/PlayerForm";
import { Modal } from "@/components/ui/Modal";
import { useSearchParams } from "next/navigation";
import { getTournamentName } from "@/lib/tournament-constants";

function DashboardContent() {
    const searchParams = useSearchParams();
    const entryId = searchParams.get('id');

    const [teamEntry, setTeamEntry] = useState<TeamEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        fetch("/api/settings").then(res => res.json()).then(setSettings).catch(console.error);
    }, []);

    useEffect(() => {
        if (!entryId) return;

        const fetchTeamData = async () => {
            try {
                const res = await fetch('/api/team/data', {
                    headers: { 'x-team-id': entryId }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeamEntry(data.teamEntry);
                } else {
                    console.error("Failed to fetch");
                }
            } catch (e) {
                console.error("Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeamData();
    }, [entryId]);

    const handleSavePlayer = async (player: Player) => {
        if (!teamEntry) return;

        // Optimistic Update
        const updatedPlayers = [...teamEntry.players];
        const existingIndex = updatedPlayers.findIndex(p => p.id === player.id);
        if (existingIndex >= 0) {
            updatedPlayers[existingIndex] = player;
        } else {
            updatedPlayers.push(player);
        }

        const previousEntry = { ...teamEntry };
        setTeamEntry({ ...teamEntry, players: updatedPlayers });
        setIsModalOpen(false);
        setEditingPlayer(null);

        try {
            const res = await fetch('/api/player/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-team-id': teamEntry.id
                },
                body: JSON.stringify(player)
            });

            if (!res.ok) {
                throw new Error('Save failed');
            }
        } catch (e) {
            alert("保存に失敗しました");
            setTeamEntry(previousEntry); // Rollback
        }
    };

    if (!entryId) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Invalid Entry ID</div>;
    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    if (!teamEntry) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Team Entry Not Found</div>;

    const totalPlayers = teamEntry.players.length;
    const insuranceCount = teamEntry.players.filter(p => p.insurance).length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight">{teamEntry.teamName}</h1>
                            <p className="text-xs text-indigo-400">{(teamEntry as any).projectName || teamEntry.tournamentId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-400">Representative</p>
                            <Link href={`/team/edit?id=${entryId}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 justify-end">
                                チーム設定
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    {(teamEntry as any).projectEndDate && (() => {
                        const deadline = new Date((teamEntry as any).projectEndDate);
                        const now = new Date();
                        const diffTime = deadline.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        return (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${diffTime > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-sm">
                                        {diffTime > 0 ? "エントリー・編集締切まで" : "エントリー受付期間終了"}
                                    </h3>
                                    <p className="text-xs opacity-80 mt-1">
                                        {diffTime > 0 ? `残り ${diffDays} 日 (${deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })})` : "参加内容の編集はできません。"}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 bg-slate-900 border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs text-slate-400">登録選手</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{totalPlayers}<span className="text-sm font-normal text-slate-500 ml-1">名</span></p>
                        </Card>
                        <Card className="p-4 bg-slate-900 border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-slate-400">保険加入</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400">{insuranceCount}<span className="text-sm font-normal text-slate-500 ml-1">名</span></p>
                        </Card>
                    </div>

                    {/* Player List */}
                    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">選手リスト</h2>
                                <p className="text-sm text-slate-400">大会に参加する選手を登録してください。</p>
                            </div>
                            <Button onClick={() => {
                                setEditingPlayer(null);
                                setIsModalOpen(true);
                            }} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                <Plus className="w-4 h-4 mr-2" /> 選手を追加
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950/50 text-xs uppercase font-medium text-slate-500">
                                    <tr>
                                        <th className="p-4">氏名</th>
                                        <th className="p-4 hidden md:table-cell">フリガナ</th>
                                        <th className="p-4">スポーツ保険</th>
                                        <th className="p-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {teamEntry.players.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500">
                                                選手が登録されていません
                                            </td>
                                        </tr>
                                    ) : (
                                        teamEntry.players.map((player) => (
                                            <tr key={player.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-white">{player.name}</span>
                                                        {player.isRepresentative && (
                                                            <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded border border-indigo-400">
                                                                代表
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${player.wristbandColor === '赤' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                                            player.wristbandColor === '青' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                                                'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                                                            }`}>
                                                            {player.wristbandColor}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden md:table-cell">{player.furigana}</td>
                                                <td className="p-4">
                                                    {player.insurance ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            <ShieldCheck className="w-3 h-3 mr-1" /> 加入
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                                                            未加入
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setEditingPlayer(player);
                                                        setIsModalOpen(true);
                                                    }}>
                                                        編集
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlayer ? "選手情報を編集" : "選手を追加"}>
                <PlayerForm
                    initialData={editingPlayer || undefined}
                    onSave={handleSavePlayer}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );

}

export default function TeamDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
