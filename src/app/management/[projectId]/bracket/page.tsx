"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { recordMatchResult, updateMatchScore, undoMatchResult } from "@/lib/bracket-generator";

export default function ManagementTournamentBracketPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [bracketData, setBracketData] = useState<TournamentBracketData | null>(null);
    const [bracketId, setBracketId] = useState<string | null>(null);
    const [teamCount, setTeamCount] = useState<number>(16);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSeedingTeams, setIsSeedingTeams] = useState(false);
    const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [dataRes, projectsRes, bracketRes] = await Promise.all([
                fetch('/api/admin/data'),
                fetch('/api/admin/projects'),
                fetch(`/api/admin/bracket?tournamentId=${projectId}`)
            ]);

            if (dataRes.ok) {
                const data = await dataRes.json();
                if (data.entries) setEntries(data.entries.filter((e: TeamEntry) => e.tournamentId === projectId));
            }

            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                if (projectsData.projects) {
                    const p = projectsData.projects.find((p: Project) => p.id === projectId);
                    if (p) setProject(p);
                }
            }

            if (bracketRes.ok) {
                const bracketDataJson = await bracketRes.json();
                if (bracketDataJson.bracket) {
                    setBracketId(bracketDataJson.bracket.id);
                    setBracketData(bracketDataJson.bracket.brackets as TournamentBracketData);
                } else {
                    setBracketId(null);
                    setBracketData(null);
                }
            }
        } catch (e) {
            console.error("Failed to load tournament bracket data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const seedTestTeams = async () => {
        const input = prompt("検証したいテストチーム数を指定してください (8〜16):", "16");
        if (input === null) return;
        const count = parseInt(input);
        if (isNaN(count) || count < 2 || count > 32) {
            alert("2〜32の有効な数字を入力してください。");
            return;
        }

        if (!confirm(`「${project?.name}」の既存チームデータを一度すべて削除し、新しくテストチームを ${count} チーム作成してトーナメント表を初期化します。よろしいですか？`)) return;
        setIsSeedingTeams(true);
        setSeedMessage(null);
        try {
            const res = await fetch('/api/admin/bracket/seed-teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: projectId, teamCount: count }),
            });
            const data = await res.json();
            if (data.success) {
                setSeedMessage({ type: 'success', text: data.message });
                
                // Refresh data
                const [dataRes, bracketRes] = await Promise.all([
                    fetch('/api/admin/data'),
                    fetch(`/api/admin/bracket?tournamentId=${projectId}`)
                ]);
                if (dataRes.ok) {
                    const dataJson = await dataRes.json();
                    if (dataJson.entries) setEntries(dataJson.entries.filter((e: TeamEntry) => e.tournamentId === projectId));
                }
                
                // Automatically generate a new bracket matching the seeded team count
                setTeamCount(count);
                const genRes = await fetch('/api/admin/bracket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tournamentId: projectId, teamCount: count }),
                });
                const genData = await genRes.json();
                if (genData.success) {
                    setBracketId(genData.bracket.id);
                    setBracketData(genData.bracket.brackets as TournamentBracketData);
                }
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
                body: JSON.stringify({ tournamentId: projectId, teamCount }),
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

    const handleFullscreenUndo = (matchId: string) => {
        if (!bracketData) return;
        const updated = undoMatchResult(bracketData, matchId);
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
        
        let currentScoreA: string | number | undefined = undefined;
        let currentScoreB: string | number | undefined = undefined;

        if (bracketData.format === 'blocks_and_placement') {
            bracketData.blocks?.forEach(block => {
                const match = block.matches.find(m => m.matchId === matchId);
                if (match) {
                    currentScoreA = match.scoreA;
                    currentScoreB = match.scoreB;
                }
            });
            bracketData.placementGroups?.forEach(group => {
                const match = group.matches.find(m => m.matchId === matchId);
                if (match) {
                    currentScoreA = match.scoreA;
                    currentScoreB = match.scoreB;
                }
            });
        } else {
            const allMatches = [...bracketData.initialMatches, ...bracketData.winnersMatches, ...bracketData.losersMatches];
            const match = allMatches.find(m => m.matchId === matchId);
            if (match) {
                currentScoreA = match.scoreA;
                currentScoreB = match.scoreB;
            }
        }

        const newScoreA = isSlotA ? (score === '' ? undefined : Number(score)) : currentScoreA;
        const newScoreB = !isSlotA ? (score === '' ? undefined : Number(score)) : currentScoreB;

        const updated = updateMatchScore(bracketData, matchId, newScoreA, newScoreB);
        setBracketData(updated);
        fetch('/api/admin/bracket/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bracketId, brackets: updated }),
        }).catch(console.error);
    };

    const displayUrl = `/admin/tournament-bracket/display?id=${projectId}`;
    const activeEntries = entries.filter(e => e.status !== 'cancelled');

    // Automatically suggest active entries count as default teamCount
    useEffect(() => {
        if (!isLoading && !bracketData && activeEntries.length >= 2) {
            setTeamCount(activeEntries.length);
        }
    }, [isLoading, bracketData, activeEntries.length]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="animate-spin w-8 h-8 mr-3 text-emerald-500" />
                <span className="text-lg">読み込み中...</span>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4 text-center">
                <div>
                    <p className="text-xl mb-4 font-bold text-red-400">プロジェクトが見つかりません</p>
                    <Button onClick={() => router.push('/management')} variant="outline" className="border-slate-700">一覧に戻る</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2" onClick={() => router.push(`/management/${projectId}`)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-emerald-400" />
                            {project.name} - トーナメント表
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Display page link */}
                        <Link href={displayUrl} target="_blank">
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
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
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/20"
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                操作画面
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-4 w-full max-w-7xl mx-auto">
                {/* Seed message toast */}
                <AnimatePresence>
                    {seedMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border font-bold text-xs ${
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
                        className="max-w-lg mx-auto mt-12 w-full"
                    >
                        <Card className="p-8 border-white/5 bg-slate-900/60 backdrop-blur-xl">
                            <div className="text-center mb-8">
                                <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-4">
                                    <Trophy className="w-12 h-12 text-emerald-400" />
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
                                        className="bg-slate-950 border-slate-800 text-2xl font-black h-14 text-center text-white"
                                    />
                                    <p className="text-xs text-slate-500 mt-1 text-center font-semibold">
                                        現在 {activeEntries.length} チームが確定エントリー済み
                                    </p>
                                </div>

                                <Button
                                    onClick={generateBracket}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                                               text-white h-14 text-lg font-bold shadow-xl shadow-emerald-500/25 border border-emerald-400/20 active:scale-95 transition-transform"
                                >
                                    {isGenerating
                                        ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />生成中...</>
                                        : <><Plus className="w-5 h-5 mr-2" />トーナメント表を生成</>}
                                </Button>

                                {/* Test team seeder (only show if test project) */}
                                {project.isTestProject && (
                                    <div className="pt-2 border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            onClick={seedTestTeams}
                                            disabled={isSeedingTeams}
                                            className="w-full text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 font-bold text-sm h-11"
                                        >
                                            {isSeedingTeams
                                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</>
                                                : <><FlaskConical className="w-4 h-4 mr-2" />テスト用チームを生成/リセット</>}
                                        </Button>
                                        <p className="text-[11px] text-slate-650 text-center mt-1">
                                            開発・動作確認用。チーム数を指定して対戦表ごと初期化します。
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col flex-1 gap-2 h-full"
                    >
                        <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1.5 focus:outline-none">
                                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                                    表示用URL:
                                    <Link href={displayUrl} target="_blank"
                                        className="text-emerald-405 hover:text-emerald-300 font-mono underline underline-offset-2">
                                        {displayUrl}
                                    </Link>
                                </span>
                                <span className="text-slate-800">•</span>
                                <span>編集内容は自動で保存されます</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {project.isTestProject && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={seedTestTeams}
                                        disabled={isSeedingTeams}
                                        className="h-7 text-xs text-slate-500 hover:text-emerald-300 px-2"
                                    >
                                        <FlaskConical className="w-3 h-3 mr-1" />
                                        テスト追加
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (confirm("トーナメント表を再生成しますか？現在の進行状況は失われます。")) {
                                            generateBracket();
                                        }
                                    }}
                                    className="h-7 text-xs text-slate-400 hover:text-rose-450 px-2"
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
                    onUndo={handleFullscreenUndo}
                    onScoreChange={handleFullscreenScoreChange}
                    readOnly={false}
                />
            )}
        </div>
    );
}
