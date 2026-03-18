"use client";

import { useState, useCallback } from "react";
import { TeamEntry, BracketMatch, TournamentBracketData } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    Trophy, ChevronRight, ChevronLeft, Crown, Skull,
    GripVertical, Users, Zap, RotateCcw, Save, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TournamentBracketProps {
    bracketData: TournamentBracketData;
    entries: TeamEntry[];
    bracketId: string;
    onBracketUpdate: (data: TournamentBracketData) => void;
    onSave: (data: TournamentBracketData, status?: string) => Promise<void>;
}

// ===== Match Card Component =====
function MatchCard({
    match,
    onWin,
    onDrop,
    side,
}: {
    match: BracketMatch;
    onWin: (matchId: string, winnerId: string) => void;
    onDrop: (slotId: string, teamId: string, teamName: string) => void;
    side: 'left' | 'center' | 'right';
}) {
    const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

    const handleDrop = (e: React.DragEvent, slotId: string) => {
        e.preventDefault();
        setDragOverSlot(null);
        const teamId = e.dataTransfer.getData("teamId");
        const teamName = e.dataTransfer.getData("teamName");
        if (teamId && teamName) {
            onDrop(slotId, teamId, teamName);
        }
    };

    const handleDragOver = (e: React.DragEvent, slotId: string) => {
        e.preventDefault();
        setDragOverSlot(slotId);
    };

    const handleDragLeave = () => {
        setDragOverSlot(null);
    };

    const isReady = match.status === 'ready' && match.slotA.teamId && match.slotB.teamId;
    const isCompleted = match.status === 'completed';

    // Color coding based on bracket side
    const borderColor = side === 'right'
        ? 'border-emerald-500/30'
        : side === 'left'
            ? 'border-rose-500/30'
            : 'border-indigo-500/30';

    const headerBg = side === 'right'
        ? 'bg-emerald-900/20'
        : side === 'left'
            ? 'bg-rose-900/20'
            : 'bg-indigo-900/20';

    const matchLabel = match.matchId.replace(/-/g, ' ').toUpperCase();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl border ${borderColor} bg-slate-900/60 backdrop-blur-sm shadow-lg overflow-hidden min-w-[240px]`}
        >
            {/* Match Header */}
            <div className={`px-3 py-1.5 ${headerBg} flex items-center justify-between`}>
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    {matchLabel}
                </span>
                {isCompleted && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        完了
                    </span>
                )}
                {isReady && !isCompleted && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                        対戦可能
                    </span>
                )}
            </div>

            {/* Slot A */}
            <SlotRow
                slot={match.slotA}
                isWinner={match.winnerId === match.slotA.teamId}
                isLoser={isCompleted && match.winnerId !== match.slotA.teamId}
                canDecide={isReady && !isCompleted}
                onWin={() => match.slotA.teamId && onWin(match.matchId, match.slotA.teamId)}
                onDrop={(e) => handleDrop(e, match.slotA.slotId)}
                onDragOver={(e) => handleDragOver(e, match.slotA.slotId)}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverSlot === match.slotA.slotId}
                side={side}
            />

            {/* VS Divider */}
            <div className="flex items-center justify-center py-0.5 bg-slate-950/50">
                <span className="text-[10px] font-black text-slate-600 tracking-widest">VS</span>
            </div>

            {/* Slot B */}
            <SlotRow
                slot={match.slotB}
                isWinner={match.winnerId === match.slotB.teamId}
                isLoser={isCompleted && match.winnerId !== match.slotB.teamId}
                canDecide={isReady && !isCompleted}
                onWin={() => match.slotB.teamId && onWin(match.matchId, match.slotB.teamId)}
                onDrop={(e) => handleDrop(e, match.slotB.slotId)}
                onDragOver={(e) => handleDragOver(e, match.slotB.slotId)}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverSlot === match.slotB.slotId}
                side={side}
            />
        </motion.div>
    );
}

// ===== Slot Row Component =====
function SlotRow({
    slot,
    isWinner,
    isLoser,
    canDecide,
    onWin,
    onDrop,
    onDragOver,
    onDragLeave,
    isDragOver,
    side,
}: {
    slot: { slotId: string; teamId?: string; teamName?: string; seedNumber?: number; isBye?: boolean };
    isWinner: boolean;
    isLoser: boolean;
    canDecide: boolean;
    onWin: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    isDragOver: boolean;
    side: 'left' | 'center' | 'right';
}) {
    if (slot.isBye) {
        return (
            <div className="px-3 py-3 flex items-center gap-2 bg-slate-950/30">
                <span className="text-slate-600 text-xs font-bold italic">BYE</span>
            </div>
        );
    }

    return (
        <div
            className={`px-3 py-2.5 flex items-center gap-2 transition-all duration-200 ${
                isDragOver
                    ? 'bg-indigo-500/20 ring-2 ring-inset ring-indigo-500/50'
                    : isWinner
                        ? 'bg-emerald-500/10'
                        : isLoser
                            ? 'bg-slate-950/50 opacity-50'
                            : 'bg-slate-900/30 hover:bg-slate-800/30'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
        >
            {slot.teamId ? (
                <>
                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {isWinner && <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                            {isLoser && <Skull className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />}
                            <span className={`font-bold text-sm truncate ${
                                isWinner ? 'text-yellow-300' : isLoser ? 'text-slate-500 line-through' : 'text-white'
                            }`}>
                                {slot.teamName}
                            </span>
                        </div>
                        {slot.seedNumber && (
                            <span className="text-[10px] text-slate-500 font-mono ml-6">
                                #{slot.seedNumber}
                            </span>
                        )}
                    </div>

                    {/* Win button */}
                    {canDecide && (
                        <button
                            onClick={onWin}
                            className={`flex-shrink-0 p-1.5 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                                side === 'center'
                                    ? 'bg-indigo-600/80 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                    : side === 'right'
                                        ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                        : 'bg-rose-600/80 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            }`}
                            title="勝ち"
                        >
                            <Trophy className="w-3.5 h-3.5" />
                        </button>
                    )}
                </>
            ) : (
                /* Empty slot - droppable */
                <div className="flex-1 flex items-center gap-2 py-1">
                    <div className={`w-full text-center py-1.5 rounded-lg border-2 border-dashed transition-colors ${
                        isDragOver
                            ? 'border-indigo-400/50 text-indigo-300'
                            : 'border-slate-700/30 text-slate-600'
                    }`}>
                        <span className="text-[11px] font-bold tracking-wide">
                            {slot.seedNumber ? `#${slot.seedNumber}` : 'ドロップ'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ===== Team Chip (draggable) =====
function TeamChip({ entry }: { entry: TeamEntry }) {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("teamId", entry.id);
        e.dataTransfer.setData("teamName", entry.teamName);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 
                       cursor-grab active:cursor-grabbing hover:border-indigo-500/30 hover:bg-slate-800 
                       hover:-translate-y-0.5 transition-all duration-200 shadow-md group"
        >
            <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-300 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-xs truncate">{entry.teamName}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{entry.players?.length || 0}名</span>
                </div>
            </div>
        </div>
    );
}

// ===== Round Column =====
function RoundColumn({
    title,
    matches,
    side,
    onWin,
    onDrop,
}: {
    title: string;
    matches: BracketMatch[];
    side: 'left' | 'center' | 'right';
    onWin: (matchId: string, winnerId: string) => void;
    onDrop: (slotId: string, teamId: string, teamName: string) => void;
}) {
    // Group matches by round
    const rounds = new Map<number, BracketMatch[]>();
    matches.forEach(m => {
        if (!rounds.has(m.round)) rounds.set(m.round, []);
        rounds.get(m.round)!.push(m);
    });

    const sortedRounds = Array.from(rounds.entries()).sort((a, b) => 
        side === 'left' ? a[0] - b[0] : a[0] - b[0]
    );

    return (
        <div className="flex-shrink-0">
            <h3 className={`text-sm font-black tracking-widest uppercase mb-4 px-1 ${
                side === 'right' ? 'text-emerald-400' : side === 'left' ? 'text-rose-400' : 'text-indigo-400'
            }`}>
                {title}
            </h3>
            <div className={`flex gap-6 ${side === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
                {sortedRounds.map(([roundNum, roundMatches]) => (
                    <div key={roundNum} className="flex flex-col gap-4 justify-center min-w-[260px]">
                        <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase text-center mb-1">
                            Round {roundNum}
                        </div>
                        {roundMatches.map(match => (
                            <MatchCard
                                key={match.matchId}
                                match={match}
                                onWin={onWin}
                                onDrop={onDrop}
                                side={side}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===== Main Component =====
export default function TournamentBracket({
    bracketData,
    entries,
    bracketId,
    onBracketUpdate,
    onSave,
}: TournamentBracketProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleWin = useCallback((matchId: string, winnerId: string) => {
        // Import dynamically to avoid circular deps
        import('@/lib/bracket-generator').then(({ recordMatchResult }) => {
            const updated = recordMatchResult(bracketData, matchId, winnerId);
            onBracketUpdate(updated);
            setHasChanges(true);
        });
    }, [bracketData, onBracketUpdate]);

    const handleDrop = useCallback((slotId: string, teamId: string, teamName: string) => {
        import('@/lib/bracket-generator').then(({ placeTeamInSlot, removeTeamFromSlots }) => {
            // First remove from any existing slot
            let updated = removeTeamFromSlots(bracketData, teamId);
            // Then place in new slot
            updated = placeTeamInSlot(updated, slotId, teamId, teamName);
            onBracketUpdate(updated);
            setHasChanges(true);
        });
    }, [bracketData, onBracketUpdate]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(bracketData, 'in_progress');
            setHasChanges(false);
        } catch (e) {
            console.error('Save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Get placed team IDs to know which are available
    const placedTeamIds = new Set<string>();
    bracketData.initialMatches.forEach(m => {
        if (m.slotA.teamId) placedTeamIds.add(m.slotA.teamId);
        if (m.slotB.teamId) placedTeamIds.add(m.slotB.teamId);
    });

    const availableEntries = entries.filter(e =>
        e.status !== 'cancelled' && !placedTeamIds.has(e.id)
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <span className="text-white font-bold text-sm">
                            {bracketData.teamCount} チーム ダブルエリミネーション
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        配置済: {placedTeamIds.size} / {bracketData.teamCount}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={hasChanges
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }
                        size="sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        保存
                    </Button>
                </div>
            </div>

            {/* Team Pool */}
            {availableEntries.length > 0 && (
                <Card className="p-4 border-white/5">
                    <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        未配置チーム（ドラッグして配置）
                        <span className="text-slate-500 font-mono">{availableEntries.length}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {availableEntries.map(entry => (
                            <TeamChip key={entry.id} entry={entry} />
                        ))}
                    </div>
                </Card>
            )}

            {/* Bracket Display - 3 column layout */}
            <div className="overflow-x-auto pb-4">
                <div className="flex gap-8 items-start min-w-max px-2">
                    {/* Losers Bracket (Left) */}
                    {bracketData.losersMatches.length > 0 && (
                        <RoundColumn
                            title="🔵 サバイバルブラケット"
                            matches={bracketData.losersMatches}
                            side="left"
                            onWin={handleWin}
                            onDrop={handleDrop}
                        />
                    )}

                    {/* Connector */}
                    <div className="flex flex-col items-center justify-center self-center gap-2 px-2">
                        <ChevronLeft className="w-6 h-6 text-rose-500/50" />
                        <span className="text-[10px] text-slate-600 font-bold tracking-wider writing-vertical">
                            LOSE
                        </span>
                    </div>

                    {/* Initial Matches (Center) */}
                    <RoundColumn
                        title="⚡ 初戦（予選）"
                        matches={bracketData.initialMatches}
                        side="center"
                        onWin={handleWin}
                        onDrop={handleDrop}
                    />

                    {/* Connector */}
                    <div className="flex flex-col items-center justify-center self-center gap-2 px-2">
                        <ChevronRight className="w-6 h-6 text-emerald-500/50" />
                        <span className="text-[10px] text-slate-600 font-bold tracking-wider writing-vertical">
                            WIN
                        </span>
                    </div>

                    {/* Winners Bracket (Right) */}
                    {bracketData.winnersMatches.length > 0 && (
                        <RoundColumn
                            title="🟢 チャンピオンブラケット"
                            matches={bracketData.winnersMatches}
                            side="right"
                            onWin={handleWin}
                            onDrop={handleDrop}
                        />
                    )}
                </div>
            </div>

            {/* Eliminated Teams */}
            {bracketData.eliminatedTeams.length > 0 && (
                <Card className="p-4 border-rose-500/20 bg-rose-950/10">
                    <h3 className="text-xs font-black text-rose-400 tracking-widest uppercase mb-3 flex items-center gap-2">
                        <Skull className="w-4 h-4" />
                        敗退チーム
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {bracketData.eliminatedTeams.map(teamId => {
                            const entry = entries.find(e => e.id === teamId);
                            return (
                                <span key={teamId} className="text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                    {entry?.teamName || teamId}
                                </span>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Champion */}
            {bracketData.champion && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                >
                    <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
                        優勝
                    </h2>
                    <p className="text-2xl font-bold text-white mt-2">
                        {entries.find(e => e.id === bracketData.champion)?.teamName}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
