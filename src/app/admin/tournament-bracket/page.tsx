"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
    Trophy, ArrowLeft, Loader2, Maximize2, Plus, RefreshCcw,
    FlaskConical, Monitor, CheckCircle2, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TeamEntry, TournamentBracketData, Project } from "@/lib/types";
import TournamentBracket from "@/components/admin/TournamentBracket";
import BracketFullscreen from "@/components/admin/BracketFullscreen";
import { recordMatchResult, updateMatchScore } from "@/lib/bracket-generator";

export default function TournamentBracketPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("2024-Spring");
    const [bracketData, setBracketData] = useState<TournamentBracketData | null>(null);
    const [bracketId, setBracketId] = useState<string | null>(null);
    const [teamCount, setTeamCount] = useState<number>(16);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSeedingTeams, setIsSeedingTeams] = useState(false);
    const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadBracket();
    }, [selectedProjectId]);

    const loadData = async () => {
        try {
            const res = await fetch('/api/admin/data');
            const data = await res.json();
            if (data.entries) setEntries(data.entries);

            const projectsRes = await fetch('/api/admin/projects');
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                if (projectsData.projects) {
                    setProjects(projectsData.projects);
                    if (projectsData.projects.length > 0) {
                        setSelectedProjectId(projectsData.projects[0].id);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBracket = async () => {
        if (!selectedProjectId) return;
        try {
            const res = await fetch(`/api/admin/bracket?tournamentId=${selectedProjectId}`);
            const data = await res.json();
            if (data.bracket) {
                setBracketId(data.bracket.id);
                setBracketData(data.bracket.brackets as TournamentBracketData);
            } else {
                setBracketId(null);
                setBracketData(null);
            }
        } catch (e) {
            console.error("Failed to load bracket", e);
        }
    };

    const seedTestTeams = async () => {
        if (!confirm(`「${selectedProjectId}」にテストチーム16チームを追加します。よろしいですか？`)) return;
        setIsSeedingTeams(true);
        setSeedMessage(null);
        try {
            const res = await fetch('/api/admin/bracket/seed-teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: selectedProjectId }),
            });
            const data = await res.json();
            if (data.success) {
                setSeedMessage({ type: 'success', text: data.message });
                await loadData(); // Refresh entries
            } else {
                setSeedMessage({ type: 'error', text: data.error || '失敗しました' });
            }
        } catch (e) {
            setSeedMessage({ type: 'error', text: 'エラーが発生しました' });
        } finally {
            setIsSeedingTeams(false);
            setTimeout(() => setSeedMessage(null), 4000);
        }
    };

    const generateBracket = async () => {
        if (teamCount < 2 || teamCount > 64) {
            alert("チーム数は2〜64の間で指定してください。");
            return;
        }
        if (bracketData && !confirm("既存のトーナメント表を上書きしますか？")) return;

        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/bracket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: selectedProjectId, teamCount }),
            });
            const data = await res.json();
            if (data.success) {
                setBracketId(data.bracket.id);
                setBracketData(data.bracket.brackets as TournamentBracketData);
            } else {
                alert(data.error || "生成に失敗しました");
            }
        } catch (e) {
            alert("エラーが発生しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const saveBracket = async (data: TournamentBracketData, status?: string) => {
        if (!bracketId) return;
        const res = await fetch('/api/admin/bracket/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bracketId, brackets: data, status }),
        });
        if (!res.ok) throw new Error("Save failed");
    };

    const handleFullscreenWin = (matchId: string, winnerId: string) => {
        if (!bracketData) return;
        const updated = recordMatchResult(bracketData, matchId, winnerId);
        setBracketData(updated);
        if (bracketId) {
            fetch('/api/admin/bracket/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bracketId, brackets: updated, status: 'in_progress' }),
            }).catch(console.error);
        }
    };

    const handleFullscreenScoreChange = async (matchId: string, isSlotA: boolean, score: string) => {
        if (!bracketData || !bracketId) return;
        
        // Find existing match to preserve the other score
        const allMatches = [...bracketData.initialMatches, ...bracketData.winnersMatches, ...bracketData.losersMatches];
        const match = allMatches.find(m => m.matchId === matchId);
        if (!match) return;

        const updated = updateMatchScore(
            bracketData, 
            matchId, 
            isSlotA ? (score === '' ? undefined : Number(score)) : match.scoreA,
            !isSlotA ? (score === '' ? undefined : Number(score)) : match.scoreB
        );
        setBracketData(updated);
        fetch('/api/admin/bracket/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bracketId, brackets: updated }),
        }).catch(console.error);
    };

    const displayUrl = `/admin/tournament-bracket/display?id=${selectedProjectId}`;
    const activeEntries = entries.filter(e => e.tournamentId === selectedProjectId && e.status !== 'cancelled');

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="animate-spin w-8 h-8 mr-3 text-indigo-500" />
                <span className="text-lg">読み込み中...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <main className="flex-1 flex flex-col p-2">
                {/* Slim Header inside Main */}
                <div className="flex items-center justify-between gap-4 mb-2 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                        <Link href="/admin"
                            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" />
                            戻る
                        </Link>
                        <div className="w-px h-4 bg-white/10" />
                        <h1 className="text-sm font-bold text-white flex items-center gap-1.5"><Trophy className="w-4 h-4 text-emerald-400"/> トーナメント表</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Project Selector */}
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none h-9 px-3"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        {/* Display page link */}
                        <Link href={displayUrl} target="_blank">
                            <Button
                                size="sm"
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600"
                            >
                                <Monitor className="w-4 h-4 mr-2" />
                                表示用画面
                            </Button>
                        </Link>

                        {/* Fullscreen (admin with controls) */}
                        {bracketData && (
                            <Button
                                onClick={() => setIsFullscreen(true)}
                                size="sm"
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                操作画面
                            </Button>
                        )}
                    </div>
                </div>

                {/* Seed message toast */}
                <AnimatePresence>
                    {seedMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            className={`mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border font-bold text-xs ${
                                seedMessage.type === 'success'
                                    ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-900/20 border-rose-500/30 text-rose-300'
                            }`}
                        >
                            {seedMessage.type === 'success'
                                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                            {seedMessage.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!bracketData ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-lg mx-auto mt-12"
                    >
                        <Card className="p-8 border-white/5 bg-slate-900/60 backdrop-blur-xl">
                            <div className="text-center mb-8">
                                <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-4">
                                    <Trophy className="w-12 h-12 text-indigo-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">トーナメント表を作成</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    チーム数を入力するとダブルエリミネーション方式の<br />
                                    トーナメント表が自動生成されます
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                        参加チーム数
                                    </label>
                                    <Input
                                        type="number"
                                        min={2}
                                        max={64}
                                        value={teamCount}
                                        onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
                                        className="bg-slate-950 border-slate-800 text-2xl font-black h-14 text-center"
                                    />
                                    <p className="text-xs text-slate-500 mt-1 text-center">
                                        現在 {activeEntries.length} チームがエントリー済み
                                    </p>
                                </div>

                                <Button
                                    onClick={generateBracket}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                                               text-white h-14 text-lg font-bold shadow-xl shadow-indigo-500/25 active:scale-95 transition-transform"
                                >
                                    {isGenerating
                                        ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />生成中...</>
                                        : <><Plus className="w-5 h-5 mr-2" />トーナメント表を生成</>}
                                </Button>

                                {/* Test team seeder */}
                                <div className="pt-2 border-t border-white/5">
                                    <Button
                                        variant="ghost"
                                        onClick={seedTestTeams}
                                        disabled={isSeedingTeams}
                                        className="w-full text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/30 font-bold text-sm h-11"
                                    >
                                        {isSeedingTeams
                                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />追加中...</>
                                            : <><FlaskConical className="w-4 h-4 mr-2" />テスト用16チームを生成</>}
                                    </Button>
                                    <p className="text-[11px] text-slate-600 text-center mt-1">
                                        開発・動作確認用。本番環境では使用しないでください。
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col flex-1 gap-2"
                    >
                        <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1.5 focus:outline-none">
                                    <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                                    表示用URL:
                                    <Link href={displayUrl} target="_blank"
                                        className="text-indigo-400 hover:text-indigo-300 font-mono underline underline-offset-2">
                                        {displayUrl}
                                    </Link>
                                </span>
                                <span className="text-slate-700">•</span>
                                <span>編集内容は自動で保存されます</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={seedTestTeams}
                                    disabled={isSeedingTeams}
                                    className="h-7 text-xs text-slate-500 hover:text-blue-300 px-2"
                                >
                                    <FlaskConical className="w-3 h-3 mr-1" />
                                    テスト追加
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (confirm("トーナメント表を再生成しますか？現在の進行状況は失われます。")) {
                                            generateBracket();
                                        }
                                    }}
                                    className="h-7 text-xs text-slate-400 hover:text-rose-400 px-2"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" />
                                    初期化
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 bg-white rounded-lg overflow-hidden shadow-sm">
                            <TournamentBracket
                                bracketData={bracketData}
                                entries={activeEntries}
                                bracketId={bracketId!}
                                onBracketUpdate={setBracketData}
                                onSave={saveBracket}
                            />
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Admin fullscreen (with win controls) */}
            {bracketData && (
                <BracketFullscreen
                    isOpen={isFullscreen}
                    onClose={() => setIsFullscreen(false)}
                    bracketData={bracketData}
                    entries={activeEntries}
                    onWin={handleFullscreenWin}
                    onScoreChange={handleFullscreenScoreChange}
                    readOnly={false}
                />
            )}
        </div>
    );
}
