"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Users, ShieldCheck, ArrowLeft, Plus, AlertCircle, Edit2, Trash2, UserCheck } from "lucide-react";
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

    const handleDeletePlayer = async (playerId: string) => {
        if (!teamEntry) return;

        const playerToDelete = teamEntry.players.find(p => p.id === playerId);
        if (playerToDelete?.isRepresentative) {
            alert("代表者は削除できません。");
            return;
        }

        if (!confirm(`${playerToDelete?.name} 選手を削除してもよろしいですか？`)) {
            return;
        }

        const previousEntry = { ...teamEntry };
        const updatedPlayers = teamEntry.players.filter(p => p.id !== playerId);
        setTeamEntry({ ...teamEntry, players: updatedPlayers });

        try {
            const res = await fetch('/api/player/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-team-id': teamEntry.id
                },
                body: JSON.stringify({ playerId })
            });

            if (!res.ok) {
                throw new Error('Delete failed');
            }
        } catch (e) {
            alert("削除に失敗しました");
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
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white leading-tight">{teamEntry.teamName}</h1>
                                {(teamEntry as any).isWaitlist && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                        キャンセル待ち
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-indigo-400">{(teamEntry as any).projectName || teamEntry.tournamentId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
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
                            <div className={`p-5 rounded-xl border flex items-start gap-4 ${diffTime > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-lg mb-1">
                                        {diffTime > 0 ? "⚠️ エントリー期限についてのお知らせ" : "❌ エントリー受付期間終了"}
                                    </h3>
                                    {diffTime > 0 ? (
                                        <div className="space-y-2 text-sm text-amber-400/90">
                                            <p className="font-bold">
                                                メンバー登録締切まで残り <span className="text-xl text-amber-300 mx-1">{diffDays}</span> 日
                                                <span className="text-xs ml-2 opacity-80">({deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })})</span>
                                            </p>
                                            <p>期限を過ぎると、追加メンバーの登録や情報変更ができなくなります。<br className="hidden sm:block" />必ず期限内に、すべての出場メンバーの「選手を追加」登録を完了させてください。</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm">
                                            参加内容の編集期限を過ぎたため、現在メンバーの登録や変更はできません。<br />変更が必要な場合は運営にお問い合わせください。
                                        </p>
                                    )}
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

                        <div className="grid grid-cols-1 gap-3 p-4">
                            {teamEntry.players.length === 0 ? (
                                <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                                    <p className="text-slate-500">選手が登録されていません</p>
                                    <Button onClick={() => {
                                        setEditingPlayer(null);
                                        setIsModalOpen(true);
                                    }} variant="outline" className="mt-4 border-slate-700">
                                        <Plus className="w-4 h-4 mr-2" /> 最初の選手を追加
                                    </Button>
                                </div>
                            ) : (
                                teamEntry.players.map((player) => (
                                    <div key={player.id} className="bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-white text-lg">{player.name}</span>
                                                    {player.isRepresentative && (
                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
                                                            代表
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{player.furigana}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    setEditingPlayer(player);
                                                    setIsModalOpen(true);
                                                }} className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {!player.isRepresentative && (
                                                    <button onClick={() => handleDeletePlayer(player.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-950/50 rounded-lg transition-colors border border-slate-800">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/50">
                                            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 items-start ${player.wristbandColor === '赤' ? 'bg-red-900/10 border-red-500/20' :
                                                player.wristbandColor === '青' ? 'bg-blue-900/10 border-blue-500/20' :
                                                    'bg-yellow-900/10 border-yellow-500/20'
                                                }`}>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">レベル/リストバンド</span>
                                                <span className={`text-sm font-bold ${player.wristbandColor === '赤' ? 'text-red-400' :
                                                    player.wristbandColor === '青' ? 'text-blue-400' : 'text-yellow-400'
                                                    }`}>
                                                    {player.wristbandColor}
                                                </span>
                                            </div>
                                            <div className={`p-2.5 rounded-lg border flex flex-col gap-1 items-start ${player.insurance ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">スポーツ保険</span>
                                                <span className={`text-sm font-bold flex items-center gap-1.5 ${player.insurance ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                    {player.insurance ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                    {player.insurance ? '加入' : '未加入'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
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
