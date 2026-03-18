"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BracketMatch, TournamentBracketData, TeamEntry } from "@/lib/types";
import { Trophy, Crown, X, Maximize2, Zap, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface BracketFullscreenProps {
    isOpen: boolean;
    onClose: () => void;
    bracketData: TournamentBracketData;
    entries: TeamEntry[];
    onWin: (matchId: string, winnerId: string) => void;
    readOnly?: boolean; // display-only mode (no win buttons)
}

// ===== Victory Celebration =====
function VictoryCelebration({ teamName, onDone }: { teamName: string; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onDone}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl cursor-pointer"
        >
            {/* Burst particles */}
            {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * 360) / 16;
                const dist = 180 + Math.random() * 100;
                return (
                    <motion.div
                        key={i}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                        animate={{
                            x: Math.cos((angle * Math.PI) / 180) * dist,
                            y: Math.sin((angle * Math.PI) / 180) * dist,
                            scale: [0, 1.5, 0],
                            opacity: [1, 1, 0],
                        }}
                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    >
                        <Star
                            className="text-yellow-400"
                            style={{ width: 20 + (i % 3) * 10, height: 20 + (i % 3) * 10 }}
                            fill="currentColor"
                        />
                    </motion.div>
                );
            })}

            <motion.div
                initial={{ scale: 0, y: 60 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
                className="text-center px-12 py-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 
                           border-2 border-yellow-400/40 shadow-[0_0_80px_rgba(234,179,8,0.3)]"
            >
                <motion.div
                    animate={{ y: [0, -12, 0], rotate: [0, -8, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="mb-6"
                >
                    <Trophy className="w-24 h-24 mx-auto text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r
                               from-yellow-200 via-amber-400 to-yellow-200 mb-4 tracking-wide"
                >
                    勝　利
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] tracking-wider"
                >
                    {teamName}
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 1.8 }}
                    className="text-slate-500 text-sm mt-6"
                >
                    タップで続ける
                </motion.p>
            </motion.div>
        </motion.div>
    );
}

// ===== Team Name Card (animatable) =====
function TeamNameCard({
    slot,
    isWinner,
    isLoser,
    canDecide,
    isHighlighted,
    onWin,
}: {
    slot: { slotId: string; teamId?: string; teamName?: string; seedNumber?: number; isBye?: boolean };
    isWinner: boolean;
    isLoser: boolean;
    canDecide: boolean;
    isHighlighted: boolean;
    onWin: () => void;
}) {
    if (slot.isBye) {
        return (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 min-h-[56px]">
                <span className="text-slate-600 font-bold italic text-lg">BYE</span>
            </div>
        );
    }

    if (!slot.teamId) {
        return (
            <div className="flex items-center justify-center px-4 py-3 min-h-[56px] border-2 border-dashed border-slate-800/60 rounded-lg mx-2 my-1">
                <span className="text-slate-600 font-bold text-xl">
                    {slot.seedNumber ? `#${slot.seedNumber}` : '—'}
                </span>
            </div>
        );
    }

    return (
        <motion.div
            layoutId={`team-${slot.teamId}`}
            layout
            className={`flex items-center justify-between px-4 py-3 min-h-[56px] transition-colors duration-500 ${
                isHighlighted
                    ? 'bg-gradient-to-r from-yellow-500/25 to-amber-500/15'
                    : isWinner
                        ? 'bg-emerald-500/10'
                        : isLoser
                            ? 'bg-slate-950/70'
                            : 'bg-slate-900/20 hover:bg-slate-800/30'
            }`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <AnimatePresence>
                    {isWinner && (
                        <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.span
                    layout
                    className={`font-black truncate ${
                        isWinner
                            ? 'text-yellow-300 text-2xl drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                            : isLoser
                                ? 'text-slate-500 line-through text-xl opacity-50'
                                : 'text-white text-2xl'
                    }`}
                    animate={isHighlighted ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                    transition={isHighlighted ? { repeat: 2, duration: 0.5 } : {}}
                >
                    {slot.teamName}
                </motion.span>
            </div>

            {canDecide && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onWin}
                    className="flex-shrink-0 ml-3 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                               hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm
                               shadow-lg shadow-indigo-500/30"
                >
                    <Trophy className="w-5 h-5" />
                </motion.button>
            )}
        </motion.div>
    );
}

// ===== Match Card for Projection =====
function ProjectionMatch({
    match,
    side,
    recentWinnerId,
    onWin,
    readOnly,
    scale,
}: {
    match: BracketMatch;
    side: 'left' | 'center' | 'right';
    recentWinnerId: string | null;
    onWin: (matchId: string, winnerId: string) => void;
    readOnly: boolean;
    scale: number;
}) {
    const isReady = match.status === 'ready' && match.slotA.teamId && match.slotB.teamId && !match.slotA.isBye && !match.slotB.isBye;
    const isCompleted = match.status === 'completed';
    const matchHighlight = recentWinnerId && match.winnerId === recentWinnerId;

    const borderCls = side === 'right'
        ? 'border-emerald-500/30'
        : side === 'left'
            ? 'border-blue-500/30'
            : 'border-indigo-500/30';

    const headerCls = side === 'right'
        ? 'bg-emerald-900/20 text-emerald-500/60'
        : side === 'left'
            ? 'bg-blue-900/20 text-blue-500/60'
            : 'bg-indigo-900/20 text-indigo-500/60';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border-2 ${borderCls} bg-slate-900/70 backdrop-blur-sm overflow-hidden
                        ${matchHighlight ? 'shadow-[0_0_30px_rgba(234,179,8,0.2)] ring-1 ring-yellow-400/30' : 'shadow-lg'}`}
            style={{ minWidth: Math.max(180, 220 * scale) }}
        >
            {/* Header */}
            <div className={`px-3 py-1.5 flex items-center justify-between ${headerCls} border-b border-white/5`}>
                <span className="text-[11px] font-black tracking-[0.2em] uppercase opacity-60">
                    {match.matchId.split('-').slice(1).join('-')}
                </span>
                {isCompleted && <span className="text-[11px] font-bold text-emerald-400/70">✓</span>}
                {isReady && !isCompleted && (
                    <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-[11px] font-bold text-amber-400"
                    >
                        LIVE
                    </motion.span>
                )}
            </div>

            {/* Team A */}
            <TeamNameCard
                slot={match.slotA}
                isWinner={match.winnerId === match.slotA.teamId}
                isLoser={isCompleted && !!match.slotA.teamId && match.winnerId !== match.slotA.teamId}
                canDecide={!!isReady && !isCompleted && !readOnly}
                isHighlighted={recentWinnerId === match.slotA.teamId && isCompleted}
                onWin={() => match.slotA.teamId && onWin(match.matchId, match.slotA.teamId)}
            />

            {/* VS divider */}
            <div className="text-center py-1 bg-slate-950/50 text-slate-700 font-black text-xs tracking-[0.4em]">VS</div>

            {/* Team B */}
            <TeamNameCard
                slot={match.slotB}
                isWinner={match.winnerId === match.slotB.teamId}
                isLoser={isCompleted && !!match.slotB.teamId && match.winnerId !== match.slotB.teamId}
                canDecide={!!isReady && !isCompleted && !readOnly}
                isHighlighted={recentWinnerId === match.slotB.teamId && isCompleted}
                onWin={() => match.slotB.teamId && onWin(match.matchId, match.slotB.teamId)}
            />
        </motion.div>
    );
}

// ===== Round Group =====
function RoundGroup({
    roundNum,
    matches,
    side,
    recentWinnerId,
    onWin,
    readOnly,
    scale,
}: {
    roundNum: number;
    matches: BracketMatch[];
    side: 'left' | 'center' | 'right';
    recentWinnerId: string | null;
    onWin: (matchId: string, winnerId: string) => void;
    readOnly: boolean;
    scale: number;
}) {
    return (
        <div className="flex flex-col gap-3 justify-center">
            <div className="text-center text-[10px] font-black tracking-[0.3em] text-slate-600 uppercase mb-1">
                Round {roundNum}
            </div>
            {matches.map(m => (
                <ProjectionMatch
                    key={m.matchId}
                    match={m}
                    side={side}
                    recentWinnerId={recentWinnerId}
                    onWin={onWin}
                    readOnly={readOnly}
                    scale={scale}
                />
            ))}
        </div>
    );
}


// ===== Section Label =====
function SectionLabel({ icon, label, colorClass }: { icon: React.ReactNode; label: string; colorClass: string }) {
    return (
        <div className={`flex items-center gap-2 mb-4 ${colorClass}`}>
            {icon}
            <span className="text-sm font-black tracking-widest uppercase">{label}</span>
        </div>
    );
}

// ===== Main Fullscreen Component =====
export default function BracketFullscreen({
    isOpen,
    onClose,
    bracketData,
    entries,
    onWin,
    readOnly = false,
}: BracketFullscreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [recentWinnerId, setRecentWinnerId] = useState<string | null>(null);
    const [celebration, setCelebration] = useState<string | null>(null);
    const [scale, setScale] = useState(1);

    // Auto-scale to fit viewport
    useEffect(() => {
        const recalc = () => {
            if (!contentRef.current) return;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const cw = contentRef.current.scrollWidth;
            const ch = contentRef.current.scrollHeight;
            const sx = vw / cw;
            const sy = vh / ch;
            setScale(Math.min(sx, sy, 1));
        };
        recalc();
        window.addEventListener('resize', recalc);
        return () => window.removeEventListener('resize', recalc);
    }, [bracketData, isOpen]);

    // Recalculate scale when bracket changes
    useEffect(() => {
        const t = setTimeout(() => {
            if (!contentRef.current) return;
            const vw = window.innerWidth - 16;
            const vh = window.innerHeight - 80; // account for header
            const cw = contentRef.current.scrollWidth;
            const ch = contentRef.current.scrollHeight;
            const sx = vw / cw;
            const sy = vh / ch;
            setScale(Math.min(sx, sy, 1));
        }, 100);
        return () => clearTimeout(t);
    }, [bracketData]);

    const enterFullscreen = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen?.().catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(enterFullscreen, 150);
    }, [isOpen, enterFullscreen]);

    const handleWin = useCallback((matchId: string, winnerId: string) => {
        const allMatches = [...bracketData.initialMatches, ...bracketData.winnersMatches, ...bracketData.losersMatches];
        const match = allMatches.find(m => m.matchId === matchId);
        const teamName = match?.slotA.teamId === winnerId ? match?.slotA.teamName : match?.slotB.teamName;

        setRecentWinnerId(winnerId);
        setCelebration(teamName || '');
        onWin(matchId, winnerId);

        setTimeout(() => setRecentWinnerId(null), 6000);
    }, [bracketData, onWin]);

    const groupByRound = (matches: BracketMatch[]) => {
        const map = new Map<number, BracketMatch[]>();
        matches.forEach(m => {
            if (!map.has(m.round)) map.set(m.round, []);
            map.get(m.round)!.push(m);
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    };

    if (!isOpen) return null;

    const hasLosers = bracketData.losersMatches.length > 0;
    const hasWinners = bracketData.winnersMatches.length > 0;

    return (
        <div ref={containerRef} className="fixed inset-0 z-[150] bg-slate-950 overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="flex-shrink-0 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-3 flex items-center justify-between h-14">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-white tracking-tight leading-tight">決勝トーナメント</h1>
                        <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                            {bracketData.teamCount} TEAMS  •  DOUBLE ELIMINATION
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={enterFullscreen}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { document.exitFullscreen?.().catch(() => {}); onClose(); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bracket area — auto-scaled */}
            <div className="flex-1 overflow-hidden flex items-center justify-center">
                <div
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                    className="flex items-start gap-0 px-4 pt-4"
                >
                    <LayoutGroup>
                        <div ref={contentRef} className="flex items-start gap-0">

                            {/* === Left Bracket (サバイバル) === */}
                            {hasLosers && (
                                <div className="flex-shrink-0 px-4">
                                    <SectionLabel
                                        icon={<div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-md shadow-blue-400/50" />}
                                        label="サバイバル"
                                        colorClass="text-blue-400"
                                    />
                                    <div className="flex gap-4 flex-row-reverse">
                                        {groupByRound(bracketData.losersMatches).map(([rn, ms]) => (
                                            <RoundGroup key={rn} roundNum={rn} matches={ms} side="left"
                                                recentWinnerId={recentWinnerId} onWin={handleWin}
                                                readOnly={readOnly} scale={scale} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Arrow left */}
                            {hasLosers && (
                                <div className="flex flex-col items-center self-center gap-1 px-1">
                                    <motion.div animate={{ x: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                                        <ChevronLeft className="w-7 h-7 text-blue-500/25" />
                                    </motion.div>
                                </div>
                            )}

                            {/* === Center — Initial Matches === */}
                            <div className="flex-shrink-0 px-4">
                                <SectionLabel
                                    icon={<Zap className="w-4 h-4 text-indigo-400" />}
                                    label="初戦"
                                    colorClass="text-indigo-400"
                                />
                                <div className="flex flex-col gap-3">
                                    {bracketData.initialMatches.map(m => (
                                        <ProjectionMatch
                                            key={m.matchId}
                                            match={m}
                                            side="center"
                                            recentWinnerId={recentWinnerId}
                                            onWin={handleWin}
                                            readOnly={readOnly}
                                            scale={scale}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Arrow right */}
                            {hasWinners && (
                                <div className="flex flex-col items-center self-center gap-1 px-1">
                                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                                        <ChevronRight className="w-7 h-7 text-emerald-500/25" />
                                    </motion.div>
                                </div>
                            )}

                            {/* === Right Bracket (チャンピオン) === */}
                            {hasWinners && (
                                <div className="flex-shrink-0 px-4">
                                    <SectionLabel
                                        icon={<div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />}
                                        label="チャンピオン"
                                        colorClass="text-emerald-400"
                                    />
                                    <div className="flex gap-4">
                                        {groupByRound(bracketData.winnersMatches).map(([rn, ms]) => (
                                            <RoundGroup key={rn} roundNum={rn} matches={ms} side="right"
                                                recentWinnerId={recentWinnerId} onWin={handleWin}
                                                readOnly={readOnly} scale={scale} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </LayoutGroup>
                </div>
            </div>

            {/* Eliminated bar */}
            {bracketData.eliminatedTeams.length > 0 && (
                <div className="flex-shrink-0 border-t border-white/5 bg-slate-950/80 px-5 py-2 flex items-center gap-3 overflow-x-auto">
                    <span className="text-[11px] font-black text-slate-500 tracking-widest uppercase flex-shrink-0">敗退</span>
                    {bracketData.eliminatedTeams.map(id => {
                        const e = entries.find(x => x.id === id);
                        return (
                            <span key={id} className="text-xs text-slate-600 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 flex-shrink-0">
                                {e?.teamName || id}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Victory Overlay */}
            <AnimatePresence>
                {celebration && (
                    <VictoryCelebration
                        teamName={celebration}
                        onDone={() => setCelebration(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
