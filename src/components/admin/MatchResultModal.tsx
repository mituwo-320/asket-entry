
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, Trophy, Save } from "lucide-react";
import { Match, TeamEntry } from "@/lib/types";

interface MatchResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
    getTeamName: (id: string) => string;
    onUpdate: (updatedMatch: Match) => void;
}

export default function MatchResultModal({ isOpen, onClose, match, getTeamName, onUpdate }: MatchResultModalProps) {
    const [scoreA, setScoreA] = useState<string>("");
    const [scoreB, setScoreB] = useState<string>("");
    const [status, setStatus] = useState<'scheduled' | 'playing' | 'finished'>('scheduled');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (match) {
            setScoreA(match.scoreA !== undefined ? match.scoreA.toString() : "");
            setScoreB(match.scoreB !== undefined ? match.scoreB.toString() : "");
            setStatus(match.status);
        }
    }, [match]);

    if (!isOpen || !match) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const numScoreA = scoreA === "" ? undefined : parseInt(scoreA);
            const numScoreB = scoreB === "" ? undefined : parseInt(scoreB);

            // Determine winner automatically if finished
            let winnerId = match.winnerId;
            if (status === 'finished' && numScoreA !== undefined && numScoreB !== undefined) {
                if (numScoreA > numScoreB) winnerId = match.teamIdA;
                else if (numScoreB > numScoreA) winnerId = match.teamIdB;
                else winnerId = undefined; // Draw or decided by other means (e.g. PK - not implemented yet)
            }

            const updates = {
                scoreA: numScoreA,
                scoreB: numScoreB,
                status: status,
                winnerId: winnerId
            };

            const response = await fetch('/api/match/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: match.id, updates })
            });

            if (!response.ok) throw new Error('Failed to update');

            const data = await response.json();
            if (data.success) {
                onUpdate(data.match);
                onClose();
            } else {
                alert('更新に失敗しました');
            }
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        試合結果編集
                    </h2>

                    <div className="space-y-6">
                        {/* Status Selection */}
                        <div className="flex justify-center bg-slate-950/50 p-1 rounded-xl border border-white/5">
                            {(['scheduled', 'playing', 'finished'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${status === s
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {s === 'scheduled' && '予定'}
                                    {s === 'playing' && '試合中'}
                                    {s === 'finished' && '終了'}
                                </button>
                            ))}
                        </div>

                        {/* Valid Match Check */}
                        {(match.teamIdA === 'Bye' || match.teamIdB === 'Bye') ? (
                            <div className="text-center text-slate-500 py-4">
                                不戦勝のためスコア入力は不要です
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                {/* Team A */}
                                <div className="flex-1 text-center space-y-2">
                                    <div className="h-10 flex items-center justify-center font-bold text-white truncate px-3 bg-slate-800/80 rounded-xl border border-white/5">
                                        {getTeamName(match.teamIdA)}
                                    </div>
                                    <Input
                                        type="number"
                                        value={scoreA}
                                        onChange={(e) => setScoreA(e.target.value)}
                                        className="text-center text-3xl font-mono font-black h-20 bg-slate-950 border-slate-700/50 rounded-xl shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="text-slate-500 font-bold text-xl pt-12">
                                    -
                                </div>

                                {/* Team B */}
                                <div className="flex-1 text-center space-y-2">
                                    <div className="h-10 flex items-center justify-center font-bold text-white truncate px-3 bg-slate-800/80 rounded-xl border border-white/5">
                                        {getTeamName(match.teamIdB)}
                                    </div>
                                    <Input
                                        type="number"
                                        value={scoreB}
                                        onChange={(e) => setScoreB(e.target.value)}
                                        className="text-center text-3xl font-mono font-black h-20 bg-slate-950 border-slate-700/50 rounded-xl shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full py-6 mt-4 font-bold text-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "保存中..." : (
                                <span className="flex items-center gap-2">
                                    <Save className="w-5 h-5" /> 保存する
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
