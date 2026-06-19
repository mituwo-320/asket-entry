"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { 
    TeamEntry, BracketMatch, TournamentBracketData, 
    TournamentBlock, BlockMatch, PlacementGroup, BlockStandingRow 
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    Trophy, ChevronRight, ChevronLeft, Crown, Skull,
    GripVertical, Users, Zap, RotateCcw, Save, Loader2, Settings, X, RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    recordMatchResult, undoMatchResult, randomizeFirstRound, 
    updateMatchInfo, updateMatchScore, placeTeamInSlot, removeTeamFromSlots,
    autoFillMockResults
} from "@/lib/bracket-generator";

interface TournamentBracketProps {
    bracketData: TournamentBracketData;
    entries: TeamEntry[];
    bracketId: string;
    onBracketUpdate: (data: TournamentBracketData) => void;
    onSave: (data: TournamentBracketData, status?: string) => Promise<void>;
}

// ===== League Standings (星取表) Component =====
function BlockStandingTable({ standings }: { standings?: BlockStandingRow[] }) {
    if (!standings || standings.length === 0) {
        return <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 mt-2">予選ブロック配置完了後に集計されます</p>;
    }
    return (
        <table className="w-full text-xs text-left border border-slate-250 rounded-lg overflow-hidden bg-white shadow-sm mt-2">
            <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-250">
                <tr>
                    <th className="px-2 py-1.5">順位</th>
                    <th className="px-2 py-1.5">チーム</th>
                    <th className="px-2 py-1.5 text-center">試合</th>
                    <th className="px-2 py-1.5 text-center">勝</th>
                    <th className="px-2 py-1.5 text-center">負</th>
                    <th className="px-2 py-1.5 text-center">得失点</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
                {standings.map((row) => (
                    <tr key={row.teamId} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 font-bold">
                            {row.rank ? `${row.rank}位` : '-'}
                        </td>
                        <td className="px-2 py-1.5 font-bold text-slate-800 truncate max-w-[100px]" title={row.teamName}>
                            {row.teamName}
                        </td>
                        <td className="px-2 py-1.5 text-center">{row.played}</td>
                        <td className="px-2 py-1.5 text-center text-emerald-600 font-bold">{row.won}</td>
                        <td className="px-2 py-1.5 text-center text-slate-400">{row.lost}</td>
                        <td className="px-2 py-1.5 text-center font-bold font-mono">
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ===== League Crosstable (総当たり星取表) Component =====
function BlockCrosstable({ block }: { block: TournamentBlock }) {
    const teams = block.slots.filter(s => s.teamId && s.teamName);
    if (teams.length === 0) {
        return <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 mt-2">予選ブロック配置完了後に表示されます</p>;
    }

    return (
        <div className="overflow-x-auto mt-2 border border-slate-200 rounded-lg shadow-sm bg-white">
            <table className="w-full text-xs text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-2 py-1.5 font-bold text-slate-700">チーム</th>
                        {teams.map(t => (
                            <th key={t.slotId} className="px-2 py-1.5 font-bold text-slate-700 text-center truncate max-w-[80px]" title={t.teamName}>
                                {t.teamName}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                    {teams.map(rowTeam => (
                        <tr key={rowTeam.slotId} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-bold text-slate-800 truncate max-w-[100px]" title={rowTeam.teamName}>
                                {rowTeam.teamName}
                            </td>
                            {teams.map(colTeam => {
                                if (rowTeam.slotId === colTeam.slotId) {
                                    return <td key={colTeam.slotId} className="bg-slate-50 border-r border-slate-100" />;
                                }

                                const match = block.matches.find(m => 
                                    (m.slotA.teamId === rowTeam.teamId && m.slotB.teamId === colTeam.teamId) ||
                                    (m.slotA.teamId === colTeam.teamId && m.slotB.teamId === rowTeam.teamId)
                                );

                                if (!match || match.status !== 'completed') {
                                    return <td key={colTeam.slotId} className="text-center text-slate-400 py-1.5 border-r border-slate-100 font-mono">-</td>;
                                }

                                const isSlotA = match.slotA.teamId === rowTeam.teamId;
                                const rowScore = isSlotA ? match.scoreA : match.scoreB;
                                const colScore = isSlotA ? match.scoreB : match.scoreA;
                                const isWinner = match.winnerId === rowTeam.teamId;

                                return (
                                    <td key={colTeam.slotId} className="text-center py-1.5 border-r border-slate-100 font-medium">
                                        <span className={`inline-block mr-1 text-[10px] ${isWinner ? 'text-emerald-600 font-bold' : 'text-rose-500'}`}>
                                            {isWinner ? '○' : '●'}
                                        </span>
                                        <span className="font-mono">{rowScore}-{colScore}</span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PlacementCrosstable({ group }: { group: PlacementGroup }) {
    const teams = group.teams;
    if (teams.length === 0) {
        return <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 mt-2">ブロック予選集計待ち</p>;
    }

    return (
        <div className="overflow-x-auto mt-2 border border-slate-200 rounded-lg shadow-sm bg-white">
            <table className="w-full text-xs text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-2 py-1.5 font-bold text-slate-700">チーム</th>
                        {teams.map(t => (
                            <th key={t.id} className="px-2 py-1.5 font-bold text-slate-700 text-center truncate max-w-[80px]" title={t.name}>
                                {t.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                    {teams.map(rowTeam => (
                        <tr key={rowTeam.id} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 font-bold text-slate-800 truncate max-w-[100px]" title={rowTeam.name}>
                                {rowTeam.name}
                            </td>
                            {teams.map(colTeam => {
                                if (rowTeam.id === colTeam.id) {
                                    return <td key={colTeam.id} className="bg-slate-50 border-r border-slate-100" />;
                                }

                                const match = group.matches.find(m => 
                                    (m.slotA.teamId === rowTeam.id && m.slotB.teamId === colTeam.id) ||
                                    (m.slotA.teamId === colTeam.id && m.slotB.teamId === rowTeam.id)
                                );

                                if (!match || match.status !== 'completed') {
                                    return <td key={colTeam.id} className="text-center text-slate-400 py-1.5 border-r border-slate-100 font-mono">-</td>;
                                }

                                const isSlotA = match.slotA.teamId === rowTeam.id;
                                const rowScore = isSlotA ? match.scoreA : match.scoreB;
                                const colScore = isSlotA ? match.scoreB : match.scoreA;
                                const isWinner = match.winnerId === rowTeam.id;

                                return (
                                    <td key={colTeam.id} className="text-center py-1.5 border-r border-slate-100 font-medium">
                                        <span className={`inline-block mr-1 text-[10px] ${isWinner ? 'text-emerald-600 font-bold' : 'text-rose-500'}`}>
                                            {isWinner ? '○' : '●'}
                                        </span>
                                        <span className="font-mono">{rowScore}-{colScore}</span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ===== Block Match Placeholder Helper =====
function getBlockMatchSlotPlaceholder(
    slot: { teamId?: string; teamName?: string; sourceMatchId?: string; isWinner?: boolean; slotId?: string },
    matchId: string,
    isSlotA: boolean
): string {
    if (slot.teamName) return slot.teamName;
    
    // Check if it is a placement match (starts with 'P-')
    if (matchId.startsWith('P-')) {
        const parts = matchId.split('-'); // e.g. ['P', '1st', 'M1']
        const rankStr = parts[1]; // '1st', '2nd', '3rd', '4th'
        const matchStr = parts[2]; // 'M1', 'M2', 'M3'
        
        let rankNum = '1';
        if (rankStr === '2nd') rankNum = '2';
        if (rankStr === '3rd') rankNum = '3';
        if (rankStr === '4th') rankNum = '4';
        
        if (rankStr === '4th') {
            return isSlotA ? 'Aブロック4位' : 'Bブロック4位';
        }
        
        // M1: A vs B, M2: B vs C, M3: C vs A
        if (matchStr === 'M1') {
            return isSlotA ? `Aブロック${rankNum}位` : `Bブロック${rankNum}位`;
        } else if (matchStr === 'M2') {
            return isSlotA ? `Bブロック${rankNum}位` : `Cブロック${rankNum}位`;
        } else if (matchStr === 'M3') {
            return isSlotA ? `Cブロック${rankNum}位` : `Aブロック${rankNum}位`;
        }
    }
    
    // Check if it has a source match (block tournament final/3rd place)
    if (slot.sourceMatchId) {
        const matchLabel = slot.sourceMatchId.split('-').pop() || ''; // e.g. 'SF1'
        return `${matchLabel}の${slot.isWinner ? '勝者' : '敗者'}`;
    }

    if (slot.slotId) {
        const parts = slot.slotId.split('-'); // e.g. ['S', 'B', '1']
        if (parts.length === 3) {
            return `${parts[1]}ブロック${parts[2]}枠`;
        }
    }
    
    return '未決定';
}

// ===== Block Match Card Component =====
function BlockMatchCard({
    match,
    onWin,
    onUndo,
    showScores,
    onScoreChange,
}: {
    match: BlockMatch;
    onWin: (matchId: string, winnerId: string) => void;
    onUndo?: (matchId: string) => void;
    showScores: boolean;
    onScoreChange: (matchId: string, isSlotA: boolean, val: string) => void;
}) {
    const isReady = match.status === 'ready' && !!match.slotA.teamId && !!match.slotB.teamId;
    const isCompleted = match.status === 'completed';

    const placeholderA = getBlockMatchSlotPlaceholder(match.slotA, match.matchId, true);
    const placeholderB = getBlockMatchSlotPlaceholder(match.slotB, match.matchId, false);

    return (
        <div className="rounded-xl border border-slate-250 bg-white shadow-sm overflow-hidden text-xs min-w-[200px]">
            {/* Match Header */}
            <div className="px-2 py-1 bg-slate-50 flex items-center justify-between border-b border-slate-200 text-slate-600 font-bold">
                <span className="font-mono text-[9px]">{match.matchId.split('-').slice(1).join('-')}</span>
                <div className="flex items-center gap-1">
                    {match.court && <span className="bg-slate-200 text-slate-700 px-1 rounded text-[8px] font-bold">{match.court}</span>}
                    {isCompleted ? (
                        <span className="text-emerald-700 font-bold text-[9px] bg-emerald-55 px-1 rounded">完了</span>
                    ) : isReady ? (
                        <span className="text-amber-700 font-bold text-[9px] animate-pulse bg-amber-55 px-1 rounded">対戦</span>
                    ) : (
                        <span className="text-slate-400 text-[8px] bg-slate-100 px-1 rounded">待機</span>
                    )}
                </div>
            </div>

            {/* Slot A */}
            <div className={`px-2 py-1.5 flex items-center justify-between border-b border-slate-100 ${match.winnerId === match.slotA.teamId ? 'bg-emerald-50/70 font-bold text-emerald-900' : ''}`}>
                <span className={`truncate max-w-[120px] ${match.slotA.teamId ? 'font-medium text-slate-800' : 'text-slate-400 italic'}`}>
                    {placeholderA}
                </span>
                <div className="flex items-center gap-1">
                    {showScores && (
                        <input
                            type="text"
                            value={match.scoreA ?? ''}
                            onChange={(e) => onScoreChange(match.matchId, true, e.target.value)}
                            className="w-8 text-center border border-slate-350 rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold text-[10px]"
                            placeholder="点"
                        />
                    )}
                    {isReady && !isCompleted && match.slotA.teamId && (
                        <button onClick={() => onWin(match.matchId, match.slotA.teamId!)} className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded p-0.5 hover:bg-indigo-100 transition-colors" title="勝ち">
                            <Trophy className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Slot B */}
            <div className={`px-2 py-1.5 flex items-center justify-between ${match.winnerId === match.slotB.teamId ? 'bg-emerald-50/70 font-bold text-emerald-900' : ''}`}>
                <span className={`truncate max-w-[120px] ${match.slotB.teamId ? 'font-medium text-slate-800' : 'text-slate-400 italic'}`}>
                    {placeholderB}
                </span>
                <div className="flex items-center gap-1">
                    {showScores && (
                        <input
                            type="text"
                            value={match.scoreB ?? ''}
                            onChange={(e) => onScoreChange(match.matchId, false, e.target.value)}
                            className="w-8 text-center border border-slate-350 rounded px-0.5 py-0.5 bg-white text-slate-900 font-bold text-[10px]"
                            placeholder="点"
                        />
                    )}
                    {isReady && !isCompleted && match.slotB.teamId && (
                        <button onClick={() => onWin(match.matchId, match.slotB.teamId!)} className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded p-0.5 hover:bg-indigo-100 transition-colors" title="勝ち">
                            <Trophy className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {isCompleted && onUndo && (
                <div className="bg-slate-50 border-t border-slate-100 py-0.5 flex justify-end px-2">
                    <button onClick={() => onUndo(match.matchId)} className="text-slate-400 hover:text-rose-500 font-bold text-[8px] flex items-center gap-0.5 transition-colors">
                        <RotateCcw className="w-2.5 h-2.5" /> 結果変更
                    </button>
                </div>
            )}
        </div>
    );
}

// ===== Double Elimination Match Card Component =====
function MatchCard({
    match,
    onWin,
    onUndo,
    onEdit,
    onDrop,
    side,
    showScores,
    onScoreChange,
    matchRefs,
}: {
    match: BracketMatch;
    onWin: (matchId: string, winnerId: string) => void;
    onUndo?: (matchId: string) => void;
    onEdit?: (match: BracketMatch) => void;
    onDrop: (slotId: string, teamId: string, teamName: string) => void;
    side: 'left' | 'center' | 'right';
    showScores: boolean;
    onScoreChange: (matchId: string, isSlotA: boolean, val: string) => void;
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
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

    const isReady = match.status === 'ready' && !!match.slotA.teamId && !!match.slotB.teamId;
    const isCompleted = match.status === 'completed';

    // Color coding based on bracket side (Light Theme)
    const borderColor = side === 'left' // left is now WINNERS
        ? 'border-emerald-300'
        : side === 'right' // right is now LOSERS
            ? 'border-rose-300'
            : 'border-indigo-300'; // center is Initial

    const headerBg = side === 'left'
        ? 'bg-emerald-50 text-emerald-800'
        : side === 'right'
            ? 'bg-rose-50 text-rose-800'
            : 'bg-indigo-50 text-indigo-800';

    const matchLabel = match.matchId.replace(/-/g, ' ').toUpperCase();

    return (
        <motion.div
            ref={el => { matchRefs.current[match.matchId] = el; }}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl border-2 z-10 relative ${borderColor} bg-white shadow-md overflow-hidden min-w-[240px]`}
        >
            {/* Match Header */}
            <div className={`px-3 py-1.5 ${headerBg} flex items-center justify-between border-b ${borderColor}`}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-80">
                        {matchLabel}
                    </span>
                    {(match.court || match.referee) && (
                        <div className="flex items-center gap-1.5 text-[8px] font-bold bg-black/5 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            {match.court && <span>{match.court}</span>}
                            {match.court && match.referee && <span>/</span>}
                            {match.referee && <span>審:{match.referee}</span>}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-end gap-1 min-w-[60px]">
                    {isCompleted && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-300">
                            完了
                        </span>
                    )}
                    {isReady && !isCompleted && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            対戦
                        </span>
                    )}
                    {onEdit && (
                        <button onClick={() => onEdit(match)} className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors" title="設定">
                            <Settings className="w-3 h-3" />
                        </button>
                    )}
                    {onUndo && (
                        <button onClick={() => onUndo(match.matchId)} className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors" title="リセット">
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Slot A */}
            <SlotRow
                slot={match.slotA}
                score={match.scoreA}
                isWinner={match.winnerId === match.slotA.teamId}
                isLoser={isCompleted && match.winnerId !== match.slotA.teamId}
                canDecide={!!isReady && !isCompleted}
                onWin={() => match.slotA.teamId && onWin(match.matchId, match.slotA.teamId)}
                onDrop={(e) => handleDrop(e, match.slotA.slotId)}
                onDragOver={(e) => handleDragOver(e, match.slotA.slotId)}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverSlot === match.slotA.slotId}
                side={side}
                showScore={showScores}
                onScoreChange={(val) => onScoreChange(match.matchId, true, val)}
            />

            {/* VS Divider */}
            <div className="flex items-center justify-center py-0.5 bg-slate-50 border-y border-slate-100">
                <span className="text-[10px] font-black text-slate-400 tracking-widest">VS</span>
            </div>

            {/* Slot B */}
            <SlotRow
                slot={match.slotB}
                score={match.scoreB}
                isWinner={match.winnerId === match.slotB.teamId}
                isLoser={isCompleted && match.winnerId !== match.slotB.teamId}
                canDecide={!!isReady && !isCompleted}
                onWin={() => match.slotB.teamId && onWin(match.matchId, match.slotB.teamId)}
                onDrop={(e) => handleDrop(e, match.slotB.slotId)}
                onDragOver={(e) => handleDragOver(e, match.slotB.slotId)}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverSlot === match.slotB.slotId}
                side={side}
                showScore={showScores}
                onScoreChange={(val) => onScoreChange(match.matchId, false, val)}
            />
        </motion.div>
    );
}

// ===== Double Elimination Slot Row Component =====
function SlotRow({
    slot,
    score,
    isWinner,
    isLoser,
    canDecide,
    onWin,
    onDrop,
    onDragOver,
    onDragLeave,
    isDragOver,
    side,
    showScore,
    onScoreChange,
}: {
    slot: { slotId: string; teamId?: string; teamName?: string; seedNumber?: number; isBye?: boolean };
    score?: string | number;
    isWinner: boolean;
    isLoser: boolean;
    canDecide: boolean;
    onWin: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    isDragOver: boolean;
    side: 'left' | 'center' | 'right';
    showScore: boolean;
    onScoreChange: (val: string) => void;
}) {
    if (slot.isBye) {
        return (
            <div className="px-3 py-3 flex items-center gap-2 bg-slate-50">
                <span className="text-slate-400 text-xs font-bold italic">BYE</span>
            </div>
        );
    }

    return (
        <div
            className={`px-3 py-2.5 flex items-center gap-2 transition-all duration-200 ${
                isDragOver
                    ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300'
                    : isWinner
                        ? `bg-emerald-50 border-y border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)] relative z-10 ${side === 'left' ? 'border-l-4 border-r border-emerald-500' : 'border-r-4 border-l border-emerald-500'}`
                        : isLoser
                            ? 'bg-slate-50 opacity-60 border-y border-transparent border-l-4 border-r'
                            : 'bg-white hover:bg-slate-50 border-y border-transparent border-l-4 border-r'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
        >
            {slot.teamId ? (
                <>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {isWinner && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            {isLoser && <Skull className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                            <span className={`font-bold text-sm truncate ${
                                isWinner ? 'text-emerald-850' : isLoser ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}>
                                {slot.teamName}
                            </span>
                        </div>
                        {slot.seedNumber && (
                            <span className="text-[10px] text-slate-400 font-mono ml-6">
                                #{slot.seedNumber}
                            </span>
                        )}
                    </div>

                    {showScore && (
                        <input
                            type="text"
                            value={score ?? ''}
                            onChange={(e) => onScoreChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="点"
                            className="w-10 text-center text-sm font-bold border border-slate-300 rounded px-1 py-1 focus:outline-none focus:border-indigo-500 bg-white text-slate-900"
                        />
                    )}

                    {/* Win button */}
                    {canDecide && (
                        <button
                            onClick={onWin}
                            className={`flex-shrink-0 p-1.5 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                                side === 'center'
                                    ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200'
                                    : side === 'left'
                                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200'
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
                            ? 'border-indigo-400 text-indigo-500 bg-indigo-50'
                            : 'border-slate-350 text-slate-400'
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

// ===== Double Elimination Round Column =====
function RoundColumn({
    title,
    matches,
    side,
    showScores,
    onScoreChange,
    onWin,
    onUndo,
    onEdit,
    onDrop,
    matchRefs,
}: {
    title: string;
    matches: BracketMatch[];
    side: 'left' | 'center' | 'right';
    showScores: boolean;
    onScoreChange: (matchId: string, isSlotA: boolean, val: string) => void;
    onWin: (matchId: string, winnerId: string) => void;
    onUndo?: (matchId: string) => void;
    onEdit?: (m: BracketMatch) => void;
    onDrop: (slotId: string, teamId: string, teamName: string) => void;
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
    const rounds = new Map<number, BracketMatch[]>();
    matches.forEach(m => {
        if (!rounds.has(m.round)) rounds.set(m.round, []);
        rounds.get(m.round)!.push(m);
    });

    const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

    return (
        <div className="flex-shrink-0">
            <h3 className={`text-sm font-black tracking-widest uppercase mb-4 px-1 ${
                side === 'left' ? 'text-emerald-600' : side === 'right' ? 'text-rose-600' : 'text-indigo-600'
            }`}>
                {title}
            </h3>
            <div className={`flex gap-6 items-stretch ${side === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
                {sortedRounds.map(([roundNum, roundMatches]) => (
                    <div key={roundNum} className="flex flex-col gap-4 justify-around min-w-[260px] py-2 h-full">
                        <div className="text-[10px] font-bold text-slate-450 tracking-widest uppercase text-center mb-1 shrink-0">
                            Round {roundNum}
                        </div>
                        {roundMatches.map(match => (
                            <MatchCard
                                key={match.matchId}
                                match={match}
                                onWin={onWin}
                                onUndo={onUndo}
                                onEdit={onEdit}
                                onDrop={onDrop}
                                side={side}
                                showScores={showScores}
                                onScoreChange={onScoreChange}
                                matchRefs={matchRefs}
                            />
                        ))}
                    </div>
                ))}
            </div>
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
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 
                       cursor-grab active:cursor-grabbing hover:border-indigo-350 hover:bg-slate-50 
                       hover:-translate-y-0.5 transition-all duration-200 shadow-sm group"
        >
            <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-slate-900 font-bold text-xs truncate">{entry.teamName}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{entry.players?.length || 0}名</span>
                </div>
            </div>
        </div>
    );
}

// ===== Match Edit Dialog (DE ONLY) =====
function MatchEditDialog({ 
    match, 
    onSave, 
    onClose 
}: { 
    match: BracketMatch; 
    onSave: (matchId: string, court: string, referee: string) => void; 
    onClose: () => void; 
}) {
    const [court, setCourt] = useState(match.court || '');
    const [referee, setReferee] = useState(match.referee || '');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-900 font-bold">試合設定</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-600 mb-1 font-bold">コート名</label>
                        <input type="text" value={court} onChange={e => setCourt(e.target.value)} placeholder="例: Aコート" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-600 mb-1 font-bold">審判チーム / 担当</label>
                        <input type="text" value={referee} onChange={e => setReferee(e.target.value)} placeholder="例: 運営 / チームA" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <Button onClick={() => onSave(match.matchId, court, referee)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold">保存</Button>
                </div>
            </div>
        </div>
    );
}

// ===== Bracket Lines (SVG Connectors, DE ONLY) =====
function BracketLines({ bracketData, matchRefs, contentRef, scale }: { bracketData: TournamentBracketData, matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>, contentRef: React.RefObject<HTMLDivElement | null>, scale: number }) {
    const [paths, setPaths] = useState<{ id: string, d: string, color: string, isLose: boolean }[]>([]);

    useEffect(() => {
        const updatePaths = () => {
            if (!contentRef.current) return;
            const newPaths: { id: string, d: string, color: string, isLose: boolean }[] = [];
            const allMatches = [...bracketData.initialMatches, ...bracketData.winnersMatches, ...bracketData.losersMatches];

            const getPos = (id: string, side: 'left' | 'right') => {
                const el = matchRefs.current[id];
                if (!el || !contentRef.current) return null;
                
                let node: HTMLElement | null = el;
                let x = 0;
                let y = 0;
                while (node && node !== contentRef.current) {
                    x += node.offsetLeft;
                    y += node.offsetTop;
                    node = node.offsetParent as HTMLElement;
                }
                
                if (side === 'right') x += el.offsetWidth;
                y += el.offsetHeight / 2;
                return { x, y };
            };

            allMatches.forEach(m => {
                // Winners connects LEFT (right-to-left)
                // Losers connects RIGHT (left-to-right)
                const outWin = m.bracket === 'initial' || m.bracket === 'winners' ? 'left' : 'right';
                const outLose = 'right';

                // Win connection
                if (m.nextWinMatchId) {
                    const destM = allMatches.find(x => x.matchId === m.nextWinMatchId);
                    if (destM) {
                        const inSide = destM.bracket === 'winners' ? 'right' : 'left';
                        const p1 = getPos(m.matchId, outWin);
                        const p2 = getPos(destM.matchId, inSide);
                        if (p1 && p2) {
                            const midX = (p1.x + p2.x) / 2;
                            newPaths.push({
                                id: `${m.matchId}-win`,
                                d: `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`,
                                color: '#10b981', // green
                                isLose: false
                            });
                        }
                    }
                }

                // Lose connection
                if (m.nextLoseMatchId) {
                    const destM = allMatches.find(x => x.matchId === m.nextLoseMatchId);
                    if (destM) {
                        const inSide = destM.bracket === 'losers' ? 'left' : 'right';
                        const p1 = getPos(m.matchId, outLose);
                        const p2 = getPos(destM.matchId, inSide);
                        
                        if (p1 && p2) {
                            const midX = p1.x + Math.abs(p2.x - p1.x) * 0.3;
                            newPaths.push({
                                id: `${m.matchId}-lose`,
                                d: `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`,
                                color: '#f43f5e', // red/rose
                                isLose: true
                            });
                        }
                    }
                }
            });

            setPaths(newPaths);
        };

        const t = setTimeout(updatePaths, 150);
        return () => clearTimeout(t);
    }, [bracketData, matchRefs, contentRef, scale]);

    return (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
            {paths.map(p => (
                <path
                    key={p.id}
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.isLose ? "4" : "5"}
                    strokeLinecap="round"
                    strokeDasharray={p.isLose ? "8 6" : "none"}
                    className="opacity-70"
                />
            ))}
        </svg>
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
    const realContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [scale, setScale] = useState(1);
    const [editingMatch, setEditingMatch] = useState<BracketMatch | null>(null);
    const [showScores, setShowScores] = useState(false);

    // Auto-scale to fit available width
    useEffect(() => {
        const updateScale = () => {
            if (!realContainerRef.current || !contentRef.current) return;
            const containerWidth = realContainerRef.current.clientWidth;
            
            const oldTransform = contentRef.current.style.transform;
            contentRef.current.style.transform = 'none';
            const contentWidth = contentRef.current.scrollWidth;
            contentRef.current.style.transform = oldTransform;

            if (contentWidth > containerWidth && containerWidth > 0) {
                setScale(Math.max((containerWidth - 32) / contentWidth, 0.5));
            } else {
                setScale(1);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [bracketData]);

    const handleWin = useCallback((matchId: string, winnerId: string) => {
        const updated = recordMatchResult(bracketData, matchId, winnerId);
        onBracketUpdate(updated);
        setHasChanges(true);
    }, [bracketData, onBracketUpdate]);

    const handleScoreChange = useCallback((matchId: string, isSlotA: boolean, val: string) => {
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
            const allMatches = [
                ...bracketData.initialMatches,
                ...bracketData.winnersMatches,
                ...bracketData.losersMatches
            ];
            const match = allMatches.find(m => m.matchId === matchId);
            if (match) {
                currentScoreA = match.scoreA;
                currentScoreB = match.scoreB;
            }
        }

        const newScoreA = isSlotA ? val : currentScoreA;
        const newScoreB = !isSlotA ? val : currentScoreB;

        const updated = updateMatchScore(bracketData, matchId, newScoreA, newScoreB);
        onBracketUpdate(updated);
        setHasChanges(true);
    }, [bracketData, onBracketUpdate]);

    const handleUndo = useCallback((matchId: string) => {
        const updated = undoMatchResult(bracketData, matchId);
        onBracketUpdate(updated);
        setHasChanges(true);
    }, [bracketData, onBracketUpdate]);

    const handleRandomize = useCallback(() => {
        if (!confirm("現在の配置をすべてクリアして、ランダムに初戦/予選ブロックを配置します。よろしいですか？")) return;
        const updated = randomizeFirstRound(bracketData, entries);
        onBracketUpdate(updated);
        setHasChanges(true);
    }, [bracketData, entries, onBracketUpdate]);

    const handleAutoFillMock = useCallback(() => {
        if (!confirm("現在対戦チームが決定している試合のスコアと勝敗をランダムに自動入力します。よろしいですか？")) return;
        const updated = autoFillMockResults(bracketData);
        onBracketUpdate(updated);
        setHasChanges(true);
    }, [bracketData, onBracketUpdate]);

    const handleSaveMatchInfo = useCallback((matchId: string, court: string, referee: string) => {
        const updated = updateMatchInfo(bracketData, matchId, court, referee);
        onBracketUpdate(updated);
        setHasChanges(true);
        setEditingMatch(null);
    }, [bracketData, onBracketUpdate]);

    const handleDrop = useCallback((slotId: string, teamId: string, teamName: string) => {
        let updated = removeTeamFromSlots(bracketData, teamId);
        updated = placeTeamInSlot(updated, slotId, teamId, teamName);
        onBracketUpdate(updated);
        setHasChanges(true);
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

    // Calculate placed teams
    const placedTeamIds = new Set<string>();
    if (bracketData.format === 'blocks_and_placement') {
        bracketData.blocks?.forEach(block => {
            block.slots.forEach(s => {
                if (s.teamId) placedTeamIds.add(s.teamId);
            });
        });
    } else {
        bracketData.initialMatches.forEach(m => {
            if (m.slotA.teamId) placedTeamIds.add(m.slotA.teamId);
            if (m.slotB.teamId) placedTeamIds.add(m.slotB.teamId);
        });
    }

    const availableEntries = entries.filter(e =>
        e.status !== 'cancelled' && !placedTeamIds.has(e.id)
    );

    const isBlocksFormat = bracketData.format === 'blocks_and_placement';

    return (
        <div className="space-y-2">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="text-slate-900 font-bold text-xs">
                            {bracketData.teamCount} チーム（{isBlocksFormat ? 'ブロック予選形式' : '左右分岐トーナメント'}）
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium tracking-wide">
                        配置済: {placedTeamIds.size} / {bracketData.teamCount}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowScores(!showScores)}
                        variant="outline"
                        className={`text-xs font-bold transition-colors ${showScores ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        size="sm"
                    >
                        得点入力: {showScores ? 'ON' : 'OFF'}
                    </Button>
                    {availableEntries.length > 0 && (
                        <Button
                            onClick={handleRandomize}
                            variant="outline"
                            className="bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-bold"
                            size="sm"
                        >
                            <Zap className="w-4 h-4 mr-1.5" />
                            おまかせ自動配置
                        </Button>
                    )}
                    <Button
                        onClick={handleAutoFillMock}
                        variant="outline"
                        className="bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-700 font-bold"
                        size="sm"
                    >
                        <RefreshCcw className="w-4 h-4 mr-1.5" />
                        テスト用スコア自動入力
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={hasChanges
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
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
                <div className="sticky top-0 z-40 py-1 bg-white/95 backdrop-blur-md -mx-2 px-2 sm:mx-0 sm:px-0 border-b border-slate-200 shadow-sm">
                    <Card className="p-2 border-slate-200 shadow-sm bg-slate-50">
                        <h3 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            未配置チーム
                            <span className="text-slate-600 font-mono bg-white px-1.5 py-0 rounded shadow-sm border border-slate-200">{availableEntries.length}</span>
                        </h3>
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableEntries.map(entry => (
                                <TeamChip key={entry.id} entry={entry} />
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {editingMatch && (
                <MatchEditDialog
                    match={editingMatch}
                    onSave={handleSaveMatchInfo}
                    onClose={() => setEditingMatch(null)}
                />
            )}

            {/* Bracket Display Area */}
            {isBlocksFormat ? (
                /* ===== RENDER BLOCKS + PLACEMENT MATCHES ===== */
                <div className="p-4 bg-slate-50 rounded-lg space-y-8">
                    {/* Blocks Grid */}
                    <div>
                        <h2 className="text-sm font-black text-slate-700 tracking-widest uppercase mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" /> 予選ブロック戦
                        </h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {bracketData.blocks?.map(block => (
                                <Card key={block.id} className="p-4 border-slate-250 bg-white space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                                            {block.name}
                                            <span className="text-[10px] text-slate-500 font-normal">
                                                （{block.type === 'league' ? '3チーム総当たり' : '4チームトーナメント'}）
                                            </span>
                                        </h3>
                                    </div>

                                    {/* Slots / Placement drag targets */}
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase">ブロック内配置</p>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {block.slots.map((slot, idx) => (
                                                <div
                                                    key={slot.slotId}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const teamId = e.dataTransfer.getData("teamId");
                                                        const teamName = e.dataTransfer.getData("teamName");
                                                        if (teamId && teamName) {
                                                            handleDrop(slot.slotId, teamId, teamName);
                                                        }
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    className="relative"
                                                >
                                                    {slot.teamId ? (
                                                        <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200/50 text-indigo-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
                                                            <span className="truncate max-w-[170px]">{slot.teamName}</span>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = removeTeamFromSlots(bracketData, slot.teamId!);
                                                                    onBracketUpdate(updated);
                                                                    setHasChanges(true);
                                                                }}
                                                                className="text-slate-400 hover:text-rose-500 ml-1.5 transition-colors"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="border-2 border-dashed border-slate-300 text-slate-400 text-center py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-indigo-50/40 transition-all cursor-default">
                                                            枠 #{idx + 1}（ドラッグして配置）
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Standings Table for League */}
                                    {block.type === 'league' && (
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase mb-1">星取順位表</p>
                                                <BlockStandingTable standings={block.standings} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase mb-1">星取マトリクス表</p>
                                                <BlockCrosstable block={block} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Block Matches List */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase">試合スケジュール</p>
                                        <div className="flex flex-col gap-2">
                                            {block.matches.map(match => (
                                                <BlockMatchCard
                                                    key={match.matchId}
                                                    match={match}
                                                    onWin={handleWin}
                                                    onUndo={handleUndo}
                                                    showScores={showScores}
                                                    onScoreChange={handleScoreChange}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Placement Matches Section */}
                    <div>
                        <h2 className="text-sm font-black text-slate-700 tracking-widest uppercase mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-emerald-500" /> 順位決定戦（予選終了後に自動で有効化されます）
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {bracketData.placementGroups?.map(group => {
                                const hasMatches = group.matches.length > 0;
                                return (
                                    <Card key={group.id} className="p-4 border-slate-250 bg-white space-y-4">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                {group.name}
                                            </h3>
                                        </div>

                                        {/* Registered placement teams */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.teams.map(team => (
                                                <span key={team.id} className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">
                                                    {team.name}
                                                </span>
                                            ))}
                                            {group.teams.length === 0 && (
                                                <span className="text-[10px] text-slate-400 italic">ブロック予選集計待ち</span>
                                            )}
                                        </div>

                                        {/* Standing list if placement group has matches */}
                                        {hasMatches && group.standings && group.standings.length > 0 && (
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase">決定リーグ順位表</p>
                                                <BlockStandingTable standings={group.standings} />
                                            </div>
                                        )}

                                        {/* Matches */}
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 tracking-wide uppercase">決定戦の対戦</p>
                                            {hasMatches ? (
                                                <div className="flex flex-col gap-2">
                                                    {group.matches.map(match => (
                                                        <BlockMatchCard
                                                            key={match.matchId}
                                                            match={match}
                                                            onWin={handleWin}
                                                            onUndo={handleUndo}
                                                            showScores={showScores}
                                                            onScoreChange={handleScoreChange}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-450 italic py-2">決定戦の試合はありません（順位自動確定済み）</p>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* ===== RENDER DOUBLE ELIMINATION BRACKET ===== */
                <div className="w-full overflow-x-auto pb-4 custom-scrollbar" ref={realContainerRef}>
                    <div 
                        ref={contentRef} 
                        className="flex gap-8 items-start min-w-max px-2 origin-top-left transition-transform duration-300"
                        style={{ transform: `scale(${scale})` }}
                    >
                        {/* Winners Bracket (Left, Flows right-to-left) */}
                        {bracketData.winnersMatches.length > 0 && (
                            <RoundColumn
                                title="🟢 チャンピオンブラケット（勝者側）"
                                matches={bracketData.winnersMatches}
                                side="left"
                                onWin={handleWin}
                                onUndo={handleUndo}
                                onEdit={setEditingMatch}
                                onDrop={handleDrop}
                                showScores={showScores}
                                onScoreChange={handleScoreChange}
                                matchRefs={matchRefs}
                            />
                        )}

                        {/* WIN Connector indicator */}
                        <div className="flex flex-col items-center justify-center self-center gap-2 px-2 opacity-0 w-4">
                            <span className="text-[10px] text-slate-500 font-black tracking-widest writing-vertical">
                                WIN
                            </span>
                        </div>

                        {/* Initial Matches (Center) */}
                        <RoundColumn
                            title="⚡ 1回戦"
                            matches={bracketData.initialMatches}
                            side="center"
                            onWin={handleWin}
                            onUndo={handleUndo}
                            onEdit={setEditingMatch}
                            onDrop={handleDrop}
                            showScores={showScores}
                            onScoreChange={handleScoreChange}
                            matchRefs={matchRefs}
                        />

                        {/* LOSE Connector indicator */}
                        <div className="flex flex-col items-center justify-center self-center gap-2 px-2 opacity-0 w-4">
                            <span className="text-[10px] text-slate-500 font-black tracking-widest writing-vertical">
                                LOSE
                            </span>
                        </div>

                        {/* Losers Bracket (Right, Flows left-to-right) */}
                        {bracketData.losersMatches.length > 0 && (
                            <RoundColumn
                                title="🔵 サバイバルブラケット（敗者復活）"
                                matches={bracketData.losersMatches}
                                side="right"
                                onWin={handleWin}
                                onUndo={handleUndo}
                                onEdit={setEditingMatch}
                                onDrop={handleDrop}
                                showScores={showScores}
                                onScoreChange={handleScoreChange}
                                matchRefs={matchRefs}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Eliminated Teams (DE ONLY) */}
            {!isBlocksFormat && bracketData.eliminatedTeams.length > 0 && (
                <Card className="p-4 border-rose-200 bg-rose-50 shadow-sm">
                    <h3 className="text-xs font-black text-rose-600 tracking-widest uppercase mb-3 flex items-center gap-2">
                        <Skull className="w-4 h-4" />
                        敗退チーム
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {bracketData.eliminatedTeams.map(teamId => {
                            const entry = entries.find(e => e.id === teamId);
                            return (
                                <span key={teamId} className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    {entry?.teamName || teamId}
                                </span>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Champion display */}
            {bracketData.champion && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                >
                    <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce drop-shadow-md" />
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600">
                        優勝
                    </h2>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                        {entries.find(e => e.id === bracketData.champion)?.teamName}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
