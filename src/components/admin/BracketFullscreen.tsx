import { useEffect, useRef, useState, useCallback, MutableRefObject } from "react";
import { BracketMatch, TournamentBracketData, TeamEntry } from "@/lib/types";
import { Trophy, Crown, X, Maximize2, Zap, Star, ChevronLeft, ChevronRight, Skull } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface BracketFullscreenProps {
    isOpen: boolean;
    onClose: () => void;
    bracketData: TournamentBracketData;
    entries: TeamEntry[];
    onWin: (matchId: string, winnerId: string) => void;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
    readOnly?: boolean; // display-only mode (no win buttons)
}

// NO-OP

// ===== Bracket Lines (SVG Connectors) =====
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
                
                // Get offset within contentRef
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
                                color: '#10b981', // emerald-500
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
                                color: '#f43f5e', // rose-500
                                isLose: true
                            });
                        }
                    }
                }
            });

            setPaths(newPaths);
        };

        // Delay to ensure layout is done
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
                    strokeWidth={p.isLose ? "6" : "8"}
                    strokeLinecap="square"
                    strokeDasharray={p.isLose ? "12 8" : "none"}
                    className="opacity-100"
                />
            ))}
        </svg>
    );
}

// ===== Team Name Card (animatable) =====
function TeamNameCard({
    slot,
    score,
    isWinner,
    isLoser,
    canDecide,
    isHighlighted,
    onWin,
    onScoreChange,
    readOnly,
}: {
    slot: { slotId: string; teamId?: string; teamName?: string; seedNumber?: number; isBye?: boolean };
    score?: string | number;
    isWinner: boolean;
    isLoser: boolean;
    canDecide: boolean;
    isHighlighted: boolean;
    onWin: () => void;
    onScoreChange?: (val: string) => void;
    readOnly: boolean;
}) {
    if (slot.isBye) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 min-h-[48px] border-t border-slate-100">
                <span className="text-slate-400 font-bold italic text-sm">BYE</span>
            </div>
        );
    }

    if (!slot.teamId) {
        return (
            <div className="flex items-center justify-center px-3 py-2 min-h-[48px] border-2 border-dashed border-slate-300 rounded-lg mx-2 my-1 bg-slate-50/50">
                <span className="text-slate-400 font-bold text-sm">
                    {slot.seedNumber ? `#${slot.seedNumber}` : '—'}
                </span>
            </div>
        );
    }

    return (
        <motion.div
            layoutId={`team-${slot.teamId}`}
            layout
            className={`flex items-center justify-between px-3 py-2 min-h-[48px] transition-colors duration-500 border-t-2 border-slate-200 ${
                isHighlighted
                    ? 'bg-amber-200'
                    : isWinner
                        ? 'bg-emerald-50'
                        : isLoser
                            ? 'bg-slate-100 opacity-60'
                            : 'bg-white hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <AnimatePresence>
                    {isWinner && (
                        <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Crown className="w-5 h-5 text-amber-500 flex-shrink-0 drop-shadow-sm" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.span
                    layout
                    className={`font-black break-words leading-tight whitespace-normal ${
                        isWinner
                            ? 'text-emerald-800 text-lg'
                            : isLoser
                                ? 'text-slate-500 line-through text-base'
                                : 'text-slate-900 text-lg'
                    }`}
                    animate={isHighlighted ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                    transition={isHighlighted ? { repeat: 2, duration: 0.5 } : {}}
                >
                    {slot.teamName}
                </motion.span>
            </div>

            {(!readOnly && onScoreChange) ? (
                <input
                    type="number"
                    value={score ?? ''}
                    onChange={(e) => onScoreChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`w-14 font-black text-xl ml-2 px-2 py-0.5 rounded-lg border-2 focus:ring-2 outline-none transition-colors text-center ${
                        isWinner 
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-900 focus:ring-emerald-500' 
                            : 'bg-white border-slate-400 text-slate-900 focus:ring-indigo-500 hover:border-indigo-500'
                    }`}
                    placeholder="-"
                />
            ) : (
                score !== undefined && score !== null && score !== '' && (
                    <div className={`font-black text-xl ml-2 px-2 py-0.5 rounded-lg border-2 ${
                        isWinner ? 'bg-emerald-100 border-emerald-500 text-emerald-900' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}>
                        {score}
                    </div>
                )
            )}

            {canDecide && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onWin}
                    className="flex-shrink-0 ml-2 px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black text-xs border border-indigo-200"
                >
                    <Trophy className="w-4 h-4" />
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
    matchRefs,
    onScoreChange,
}: {
    match: BracketMatch;
    side: 'left' | 'center' | 'right';
    recentWinnerId: string | null;
    onWin: (matchId: string, winnerId: string) => void;
    readOnly: boolean;
    scale: number;
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
}) {
    const isReady = match.status === 'ready' && match.slotA.teamId && match.slotB.teamId && !match.slotA.isBye && !match.slotB.isBye;
    const isCompleted = match.status === 'completed';
    const matchHighlight = recentWinnerId && match.winnerId === recentWinnerId;

    const borderCls = side === 'right' // Losers
        ? 'border-rose-500 border-[3px]'
        : side === 'left' // Winners
            ? 'border-emerald-500 border-[3px]'
            : 'border-indigo-500 border-[3px]'; // Center

    const headerCls = side === 'right'
        ? 'bg-rose-600 text-white'
        : side === 'left'
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 text-white';

    return (
        <motion.div
            ref={el => { matchRefs.current[match.matchId] = el; }}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 ${borderCls} bg-white overflow-hidden z-10 relative
                        ${matchHighlight ? 'shadow-2xl ring-4 ring-amber-400/50' : 'shadow-lg shadow-black/5'}`}
            style={{ width: Math.max(260, 260 * scale) }}
        >
            <div className={`px-3 py-1.5 flex items-center justify-between ${headerCls} border-b-2 ${borderCls}`}>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                        {match.matchId.split('-').slice(1).join('-')}
                    </span>
                    {(match.court || match.referee) && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-700 font-bold bg-white/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {match.court && <span>{match.court}</span>}
                            {match.court && match.referee && <span>/</span>}
                            {match.referee && <span>審:{match.referee}</span>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isCompleted && <span className="text-[10px] font-bold text-emerald-700">✓ 完了</span>}
                    {isReady && !isCompleted && (
                        <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-[10px] font-bold text-amber-600"
                        >
                            LIVE
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Team A */}
            <TeamNameCard
                slot={match.slotA}
                score={match.scoreA}
                isWinner={match.winnerId === match.slotA.teamId}
                isLoser={isCompleted && !!match.slotA.teamId && match.winnerId !== match.slotA.teamId}
                canDecide={!!isReady && !isCompleted && !readOnly}
                isHighlighted={recentWinnerId === match.slotA.teamId && isCompleted}
                onWin={() => match.slotA.teamId && onWin(match.matchId, match.slotA.teamId)}
                onScoreChange={(val) => onScoreChange?.(match.matchId, true, val)}
                readOnly={readOnly}
            />

            {/* VS divider */}
            <div className="text-center py-0.5 bg-slate-50 text-slate-400 font-black text-[10px] tracking-[0.5em] border-y border-slate-100">VS</div>

            {/* Team B */}
            <TeamNameCard
                slot={match.slotB}
                score={match.scoreB}
                isWinner={match.winnerId === match.slotB.teamId}
                isLoser={isCompleted && !!match.slotB.teamId && match.winnerId !== match.slotB.teamId}
                canDecide={!!isReady && !isCompleted && !readOnly}
                isHighlighted={recentWinnerId === match.slotB.teamId && isCompleted}
                onWin={() => match.slotB.teamId && onWin(match.matchId, match.slotB.teamId)}
                onScoreChange={(val) => onScoreChange?.(match.matchId, false, val)}
                readOnly={readOnly}
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
    matchRefs,
    onScoreChange,
}: {
    roundNum: number;
    matches: BracketMatch[];
    side: 'left' | 'center' | 'right';
    recentWinnerId: string | null;
    onWin: (matchId: string, winnerId: string) => void;
    readOnly: boolean;
    scale: number;
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
}) {
    return (
        <div className="flex flex-col gap-8 justify-around h-full z-10 relative">
            <div className="text-center text-xs font-black tracking-[0.3em] text-slate-500 uppercase shrink-0 absolute -top-8 left-0 right-0">
                R{roundNum}
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
                    matchRefs={matchRefs}
                    onScoreChange={onScoreChange}
                />
            ))}
        </div>
    );
}


// ===== Section Label =====
function SectionLabel({ icon, label, colorClass }: { icon: React.ReactNode; label: string; colorClass: string }) {
    return (
        <div className={`flex items-center gap-2 mb-8 mt-4 ${colorClass}`}>
            {icon}
            <span className="text-xl font-black tracking-widest uppercase">{label}</span>
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
    onScoreChange,
    readOnly = false,
}: BracketFullscreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
    
    const [recentWinnerId, setRecentWinnerId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [renderLinesTick, setRenderLinesTick] = useState(0);

    // Auto-scale to fit viewport
    useEffect(() => {
        const recalc = () => {
            if (!contentRef.current || !containerRef.current) return;
            // Maximize available space
            const vw = window.innerWidth - 64;
            const vh = window.innerHeight - 64; 

            const parentNode = contentRef.current.parentElement;
            if (parentNode) {
                const oldTransform = parentNode.style.transform;
                parentNode.style.transform = 'none';
                const cw = contentRef.current.scrollWidth;
                const ch = contentRef.current.scrollHeight;
                parentNode.style.transform = oldTransform;

                if (cw > 0 && ch > 0) {
                    const sx = vw / cw;
                    const sy = vh / ch;
                    setScale(Math.min(sx, sy, 1.2)); // Allow slight upscale to fill
                    setRenderLinesTick(t => t + 1); // trigger re-render of lines after scale fixes layout bounds
                }
            }
        };
        const t = setTimeout(recalc, 100);
        window.addEventListener('resize', recalc);
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', recalc);
        }
    }, [bracketData, isOpen]);

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
        <div ref={containerRef} className="fixed inset-0 z-[150] bg-white overflow-hidden flex flex-col font-sans px-8 py-8">
            
            {/* Minimal Absolute Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200">
                <button onClick={enterFullscreen}
                    className="p-2.5 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm hover:shadow-md font-bold flex items-center justify-center">
                    <Maximize2 className="w-5 h-5" />
                </button>
                <button onClick={() => { document.exitFullscreen?.().catch(() => {}); onClose(); }}
                    className="p-2.5 bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm hover:shadow-md font-bold flex items-center justify-center">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Eliminated bar absolute bottom */}
            {(bracketData.eliminatedTeams || []).length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-3xl shadow-lg border border-slate-200 flex items-center gap-3 max-w-[90vw] shrink-0 overflow-x-auto custom-scrollbar">
                    <span className="text-xs font-black text-rose-600 tracking-wider flex-shrink-0 flex items-center gap-1.5 uppercase">
                        <Skull className="w-4 h-4" /> 敗退
                    </span>
                    {(bracketData.eliminatedTeams || []).map(id => {
                        const e = entries.find(x => x.id === id);
                        return (
                            <span key={id} className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex-shrink-0 shadow-sm whitespace-nowrap">
                                {e?.teamName || id}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Bracket area — auto-scaled */}
            <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center relative radial-grid">
                <div
                    style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                    className="flex items-start gap-0 relative"
                >
                    <LayoutGroup>
                        <div ref={contentRef} className="flex flex-row items-stretch gap-0 relative">
                            {/* Connector Lines Layer */}
                            {renderLinesTick === renderLinesTick && <BracketLines bracketData={bracketData} matchRefs={matchRefs} contentRef={contentRef} scale={scale} />}

                            {/* === Left Bracket (チャンピオン) === */}
                            {hasWinners && (
                                <div className="flex-shrink-0 px-8 z-10">
                                    <SectionLabel
                                        icon={<Crown className="w-6 h-6 text-emerald-500" />}
                                        label="WINNERS"
                                        colorClass="text-emerald-600 justify-center"
                                    />
                                    <div className="flex gap-20 items-stretch flex-row-reverse h-full pt-8">
                                        {groupByRound(bracketData.winnersMatches).map(([rn, ms]) => (
                                            <RoundGroup key={rn} roundNum={rn} matches={ms} side="left"
                                                recentWinnerId={recentWinnerId} onWin={handleWin}
                                                readOnly={readOnly} scale={scale} matchRefs={matchRefs} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {hasWinners && <div className="w-8 shrink-0" />}

                            {/* === Center — Initial Matches === */}
                            <div className="flex-shrink-0 px-8 z-10 border-x-2 border-dashed border-slate-300/40">
                                <SectionLabel
                                    icon={<Zap className="w-6 h-6 text-indigo-500" />}
                                    label="INITIAL"
                                    colorClass="text-indigo-600 justify-center"
                                />
                                <div className="flex flex-col gap-10 pt-8 h-full justify-around">
                                    {bracketData.initialMatches.map(m => (
                                        <ProjectionMatch
                                            key={m.matchId}
                                            match={m}
                                            side="center"
                                            recentWinnerId={recentWinnerId}
                                            onWin={handleWin}
                                            readOnly={readOnly}
                                            scale={scale}
                                            matchRefs={matchRefs}
                                        />
                                    ))}
                                </div>
                            </div>

                            {hasLosers && <div className="w-8 shrink-0" />}

                            {/* === Right Bracket (サバイバル) === */}
                            {hasLosers && (
                                <div className="flex-shrink-0 px-8 z-10">
                                    <SectionLabel
                                        icon={<Skull className="w-6 h-6 text-rose-500" />}
                                        label="LOSERS"
                                        colorClass="text-rose-600 justify-center"
                                    />
                                    <div className="flex gap-20 items-stretch h-full pt-8">
                                        {groupByRound(bracketData.losersMatches).map(([rn, ms]) => (
                                            <RoundGroup key={rn} roundNum={rn} matches={ms} side="right"
                                                recentWinnerId={recentWinnerId} onWin={handleWin}
                                                readOnly={readOnly} scale={scale} matchRefs={matchRefs} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </LayoutGroup>
                </div>
            </div>
        </div>
    );
}
