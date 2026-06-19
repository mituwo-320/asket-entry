import { useEffect, useRef, useState, useCallback } from "react";
import { 
    BracketMatch, TournamentBracketData, TeamEntry, 
    TournamentBlock, BlockMatch, PlacementGroup, BlockStandingRow 
} from "@/lib/types";
import { 
    Trophy, Crown, X, Maximize2, Zap, Skull, Undo, 
    ZoomIn, ZoomOut, Sun, Moon, Users 
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface BracketFullscreenProps {
    isOpen: boolean;
    onClose: () => void;
    bracketData: TournamentBracketData;
    entries: TeamEntry[];
    onWin: (matchId: string, winnerId: string) => void;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
    readOnly?: boolean; // display-only mode (no win buttons)
    showScores?: boolean; // whether to show score inputs initially
    onUndo?: (matchId: string) => void;
}

// Color and Theme configuration
interface ThemeStyles {
    bg: string;
    text: string;
    textMuted: string;
    cardBg: string;
    cardBorder: string;
    slotHover: string;
    winSlotBg: string;
    winSlotText: string;
    loseSlotBg: string;
    loseSlotText: string;
    emptySlotBorder: string;
    emptySlotText: string;
    initialHeader: string;
    winnersHeader: string;
    losersHeader: string;
    winLineColor: string;
    loseLineColor: string;
    controlBg: string;
    controlBorder: string;
    controlText: string;
    tableHeader: string;
    tableRow: string;
}

const themeStyles: Record<'light' | 'dark', ThemeStyles> = {
    light: {
        bg: 'bg-white text-slate-950',
        text: 'text-slate-950 font-black',
        textMuted: 'text-slate-650',
        cardBg: 'bg-white',
        cardBorder: 'border-slate-800 border-[3px]',
        slotHover: 'hover:bg-slate-100',
        winSlotBg: 'bg-emerald-100 border-l-4 border-emerald-600',
        winSlotText: 'text-emerald-950',
        loseSlotBg: 'bg-slate-100 opacity-60',
        loseSlotText: 'text-slate-500 line-through',
        emptySlotBorder: 'border-slate-400 border-2 border-dashed',
        emptySlotText: 'text-slate-500',
        initialHeader: 'bg-slate-800 text-white border-b-2 border-slate-800',
        winnersHeader: 'bg-[#064e3b] text-white border-b-2 border-emerald-800', // Deep Forest Green
        losersHeader: 'bg-[#881337] text-white border-b-2 border-rose-800', // Deep Crimson
        winLineColor: '#047857', // Deep Emerald-700
        loseLineColor: '#be123c', // Deep Rose-700
        controlBg: 'bg-white/95 backdrop-blur-md',
        controlBorder: 'border-slate-350',
        controlText: 'text-slate-800',
        tableHeader: 'bg-slate-100 border-slate-300 text-slate-700',
        tableRow: 'hover:bg-slate-50 border-slate-200 text-slate-800',
    },
    dark: {
        bg: 'bg-slate-950 text-white',
        text: 'text-white font-black',
        textMuted: 'text-slate-400',
        cardBg: 'bg-slate-900',
        cardBorder: 'border-slate-700 border-[2px]',
        slotHover: 'hover:bg-slate-800',
        winSlotBg: 'bg-emerald-950/80 border-l-4 border-emerald-500',
        winSlotText: 'text-emerald-200',
        loseSlotBg: 'bg-slate-900/40 opacity-40',
        loseSlotText: 'text-slate-500 line-through',
        emptySlotBorder: 'border-slate-700 border-2 border-dashed',
        emptySlotText: 'text-slate-600',
        initialHeader: 'bg-slate-850 text-slate-200 border-b border-slate-700',
        winnersHeader: 'bg-emerald-800 text-white border-b border-emerald-700',
        losersHeader: 'bg-rose-800 text-white border-b border-rose-700',
        winLineColor: '#10b981', // Emerald-500
        loseLineColor: '#f43f5e', // Rose-500
        controlBg: 'bg-slate-900/95 backdrop-blur-md',
        controlBorder: 'border-slate-750',
        controlText: 'text-slate-200',
        tableHeader: 'bg-slate-800 border-slate-700 text-slate-300',
        tableRow: 'hover:bg-slate-800/40 border-slate-850 text-slate-300',
    }
};

// Dynamic scaling settings based on teamCount
const getLayoutSettings = (teamCount: number) => {
    if (teamCount <= 8) {
        return {
            cardWidth: 300,
            cardHeightClass: 'min-h-[52px]',
            fontSizeClass: 'text-lg font-black',
            headerFontSizeClass: 'text-[11px]',
            gapClass: 'gap-12',
            columnGapClass: 'gap-16',
            paddingClass: 'px-4 py-2.5',
            scoreInputWidth: 'w-16',
            scoreFontSize: 'text-xl'
        };
    } else if (teamCount <= 16) {
        return {
            cardWidth: 260,
            cardHeightClass: 'min-h-[44px]',
            fontSizeClass: 'text-sm font-black',
            headerFontSizeClass: 'text-[9px]',
            gapClass: 'gap-6',
            columnGapClass: 'gap-8',
            paddingClass: 'px-3 py-1.5',
            scoreInputWidth: 'w-14',
            scoreFontSize: 'text-base'
        };
    } else {
        return {
            cardWidth: 200,
            cardHeightClass: 'min-h-[34px]',
            fontSizeClass: 'text-[11px] font-bold',
            headerFontSizeClass: 'text-[8px]',
            gapClass: 'gap-2',
            columnGapClass: 'gap-4',
            paddingClass: 'px-2 py-0.5',
            scoreInputWidth: 'w-10',
            scoreFontSize: 'text-xs'
        };
    }
};

// ===== SVG Connector Lines for Double Elimination ONLY =====
function BracketLines({ 
    bracketData, 
    matchRefs, 
    contentRef, 
    scale, 
    styles 
}: { 
    bracketData: TournamentBracketData; 
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>; 
    contentRef: React.RefObject<HTMLDivElement | null>; 
    scale: number; 
    styles: ThemeStyles;
}) {
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
                                color: styles.winLineColor,
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
                                color: styles.loseLineColor,
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
    }, [bracketData, matchRefs, contentRef, scale, styles]);

    return (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ width: '100%', height: '100%' }}>
            {paths.map(p => (
                <path
                    key={p.id}
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.isLose ? "8" : "10"}
                    strokeLinecap="square"
                    strokeDasharray={p.isLose ? "12 8" : "none"}
                    className="opacity-100"
                />
            ))}
        </svg>
    );
}

// ===== Fullscreen Block League Standings Table =====
function FullscreenBlockStandingTable({ 
    standings, 
    styles 
}: { 
    standings?: BlockStandingRow[]; 
    styles: ThemeStyles;
}) {
    if (!standings || standings.length === 0) {
        return <p className="text-[10px] text-slate-500 italic text-center py-2">集計データがありません</p>;
    }
    return (
        <table className={`w-full text-[11px] text-left border rounded-lg overflow-hidden bg-white shadow-sm mt-1 border-collapse ${styles.controlBorder}`}>
            <thead className={`font-bold ${styles.tableHeader}`}>
                <tr className="border-b">
                    <th className="px-2 py-1">順位</th>
                    <th className="px-2 py-1">チーム</th>
                    <th className="px-2 py-1 text-center">試</th>
                    <th className="px-2 py-1 text-center">勝</th>
                    <th className="px-2 py-1 text-center">負</th>
                    <th className="px-2 py-1 text-center">得失点</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {standings.map((row) => (
                    <tr key={row.teamId} className={`border-b ${styles.tableRow}`}>
                        <td className="px-2 py-1 font-bold">
                            {row.rank ? `${row.rank}位` : '-'}
                        </td>
                        <td className="px-2 py-1 font-black truncate max-w-[90px]" title={row.teamName}>
                            {row.teamName}
                        </td>
                        <td className="px-2 py-1 text-center">{row.played}</td>
                        <td className="px-2 py-1 text-center text-emerald-600 font-bold">{row.won}</td>
                        <td className="px-2 py-1 text-center text-rose-500">{row.lost}</td>
                        <td className="px-2 py-1 text-center font-bold font-mono">
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ===== Fullscreen Block League Crosstable (星取表) Component =====
function FullscreenBlockCrosstable({ 
    block, 
    styles,
    theme
}: { 
    block: TournamentBlock; 
    styles: ThemeStyles;
    theme: 'light' | 'dark';
}) {
    const teams = block.slots.filter(s => s.teamId && s.teamName);
    if (teams.length === 0) {
        return <p className="text-[10px] text-slate-500 italic text-center py-2">予選ブロック配置完了後に表示されます</p>;
    }

    return (
        <div className={`overflow-x-auto mt-2 border rounded-lg shadow-sm border-collapse ${styles.controlBorder} ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-white'}`}>
            <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                    <tr className={`border-b ${styles.tableHeader}`}>
                        <th className="px-2 py-1 font-bold">チーム</th>
                        {teams.map(t => (
                            <th key={t.slotId} className="px-2 py-1 font-bold text-center truncate max-w-[80px]" title={t.teamName}>
                                {t.teamName}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {teams.map(rowTeam => (
                        <tr key={rowTeam.slotId} className={`border-b ${styles.tableRow}`}>
                            <td className="px-2 py-1 font-black truncate max-w-[90px]" title={rowTeam.teamName}>
                                {rowTeam.teamName}
                            </td>
                            {teams.map(colTeam => {
                                if (rowTeam.slotId === colTeam.slotId) {
                                    return <td key={colTeam.slotId} className={`border-r ${styles.controlBorder} ${theme === 'dark' ? 'bg-slate-800/40' : 'bg-slate-50'}`} />;
                                }

                                const match = block.matches.find(m => 
                                    (m.slotA.teamId === rowTeam.teamId && m.slotB.teamId === colTeam.teamId) ||
                                    (m.slotA.teamId === colTeam.teamId && m.slotB.teamId === rowTeam.teamId)
                                );

                                if (!match || match.status !== 'completed') {
                                    return <td key={colTeam.slotId} className={`text-center text-slate-500 py-1 border-r ${styles.controlBorder} font-mono`}>-</td>;
                                }

                                const isSlotA = match.slotA.teamId === rowTeam.teamId;
                                const rowScore = isSlotA ? match.scoreA : match.scoreB;
                                const colScore = isSlotA ? match.scoreB : match.scoreA;
                                const isWinner = match.winnerId === rowTeam.teamId;

                                return (
                                    <td key={colTeam.slotId} className={`text-center py-1 border-r ${styles.controlBorder} font-medium`}>
                                        <span className={`inline-block mr-1 text-[10px] ${isWinner ? 'text-emerald-500 font-bold' : 'text-rose-500'}`}>
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

// ===== Fullscreen Placement Crosstable (星取表) Component =====
function FullscreenPlacementCrosstable({ 
    group, 
    styles,
    theme
}: { 
    group: PlacementGroup; 
    styles: ThemeStyles;
    theme: 'light' | 'dark';
}) {
    const teams = group.teams;
    if (teams.length === 0) {
        return <p className="text-[10px] text-slate-500 italic text-center py-2">ブロック予選集計待ち</p>;
    }

    return (
        <div className={`overflow-x-auto mt-2 border rounded-lg shadow-sm border-collapse ${styles.controlBorder} ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-white'}`}>
            <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                    <tr className={`border-b ${styles.tableHeader}`}>
                        <th className="px-2 py-1 font-bold">チーム</th>
                        {teams.map(t => (
                            <th key={t.id} className="px-2 py-1 font-bold text-center truncate max-w-[80px]" title={t.name}>
                                {t.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {teams.map(rowTeam => (
                        <tr key={rowTeam.id} className={`border-b ${styles.tableRow}`}>
                            <td className="px-2 py-1 font-black truncate max-w-[90px]" title={rowTeam.name}>
                                {rowTeam.name}
                            </td>
                            {teams.map(colTeam => {
                                if (rowTeam.id === colTeam.id) {
                                    return <td key={colTeam.id} className={`border-r ${styles.controlBorder} ${theme === 'dark' ? 'bg-slate-800/40' : 'bg-slate-50'}`} />;
                                }

                                const match = group.matches.find(m => 
                                    (m.slotA.teamId === rowTeam.id && m.slotB.teamId === colTeam.id) ||
                                    (m.slotA.teamId === colTeam.id && m.slotB.teamId === rowTeam.id)
                                );

                                if (!match || match.status !== 'completed') {
                                    return <td key={colTeam.id} className={`text-center text-slate-500 py-1 border-r ${styles.controlBorder} font-mono`}>-</td>;
                                }

                                const isSlotA = match.slotA.teamId === rowTeam.id;
                                const rowScore = isSlotA ? match.scoreA : match.scoreB;
                                const colScore = isSlotA ? match.scoreB : match.scoreA;
                                const isWinner = match.winnerId === rowTeam.id;

                                return (
                                    <td key={colTeam.id} className={`text-center py-1 border-r ${styles.controlBorder} font-medium`}>
                                        <span className={`inline-block mr-1 text-[10px] ${isWinner ? 'text-emerald-500 font-bold' : 'text-rose-500'}`}>
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

// ===== Fullscreen Block Match Card =====
function FullscreenBlockMatchCard({
    match,
    onWin,
    onUndo,
    onScoreChange,
    showScores,
    readOnly,
    styles,
    theme,
}: {
    match: BlockMatch;
    onWin: (matchId: string, winnerId: string) => void;
    onUndo?: (matchId: string) => void;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
    showScores: boolean;
    readOnly: boolean;
    styles: ThemeStyles;
    theme: 'light' | 'dark';
}) {
    const isReady = match.status === 'ready' && !!match.slotA.teamId && !!match.slotB.teamId;
    const isCompleted = match.status === 'completed';

    const renderSlotRow = (slot: { teamId?: string; teamName?: string; sourceMatchId?: string; isWinner?: boolean; slotId?: string }, isSlotA: boolean) => {
        const hasTeam = !!slot.teamId;
        const score = isSlotA ? match.scoreA : match.scoreB;
        const isWinner = hasTeam && match.winnerId === slot.teamId;
        const isLoser = hasTeam && isCompleted && match.winnerId !== slot.teamId;

        const placeholder = getBlockMatchSlotPlaceholder(slot, match.matchId, isSlotA);

        return (
            <div className={`px-2 py-1.5 flex items-center justify-between transition-all ${
                isWinner 
                    ? styles.winSlotBg 
                    : isLoser 
                        ? styles.loseSlotBg 
                        : theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'
            }`}>
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    {isWinner && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {isLoser && <Skull className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    <span className={`font-black truncate max-w-[120px] text-xs ${isWinner ? styles.winSlotText : isLoser ? 'text-slate-400 line-through' : hasTeam ? '' : 'text-slate-500 italic'}`}>
                        {placeholder}
                    </span>
                </div>

                {showScores && hasTeam ? (
                    !readOnly && onScoreChange ? (
                        <input
                            type="number"
                            value={score ?? ''}
                            onChange={(e) => onScoreChange(match.matchId, isSlotA, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-10 text-center font-bold border border-slate-350 rounded bg-white text-slate-900 text-[10px]"
                            placeholder="-"
                        />
                    ) : (
                        score !== undefined && score !== null && score !== '' && (
                            <div className={`font-black text-xs px-1 py-0.5 rounded border border-slate-200 ${isWinner ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}>
                                {score}
                            </div>
                        )
                    )
                ) : null}

                {isReady && !isCompleted && hasTeam && !readOnly && (
                    <button onClick={() => onWin(match.matchId, slot.teamId!)} className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-1 py-0.5 ml-1.5" title="勝ち">
                        <Trophy className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`rounded-xl border bg-white overflow-hidden text-xs shadow-sm ${styles.cardBorder}`}>
            {/* Header */}
            <div className={`px-2 py-1 flex items-center justify-between border-b text-[10px] font-bold ${
                theme === 'dark' ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-250'
            }`}>
                <span className="font-mono">{match.matchId.split('-').slice(1).join('-')}</span>
                <div className="flex items-center gap-1.5">
                    {match.court && <span className="bg-slate-200 text-slate-800 px-1 rounded text-[8px] font-bold">{match.court}</span>}
                    {isCompleted ? (
                        <span className="text-emerald-600">✓ 完了</span>
                    ) : isReady ? (
                        <span className="text-amber-500 animate-pulse">LIVE</span>
                    ) : (
                        <span className="text-slate-400">待機</span>
                    )}
                </div>
            </div>

            {renderSlotRow(match.slotA, true)}
            <div className={`text-center py-0.5 text-[8px] border-y ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-650' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>VS</div>
            {renderSlotRow(match.slotB, false)}

            {isCompleted && !readOnly && onUndo && (
                <div className="bg-slate-50 border-t border-slate-100 py-0.5 flex justify-end px-2">
                    <button onClick={() => onUndo(match.matchId)} className="text-slate-400 hover:text-rose-500 font-bold text-[8px] flex items-center gap-0.5 transition-colors">
                        <Undo className="w-2.5 h-2.5" /> 戻す
                    </button>
                </div>
            )}
        </div>
    );
}

// ===== Double Elimination Slot Row =====
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
    showScores,
    styles,
    layout,
    theme,
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
    showScores: boolean;
    styles: ThemeStyles;
    layout: any;
    theme: 'light' | 'dark';
}) {
    if (slot.isBye) {
        return (
            <div className={`flex items-center justify-between ${layout.paddingClass} ${theme === 'dark' ? 'bg-slate-900/40 text-slate-500' : 'bg-slate-50 text-slate-400'} min-h-[44px] border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className="font-bold italic text-sm">BYE</span>
            </div>
        );
    }

    if (!slot.teamId) {
        return (
            <div className={`flex items-center justify-center ${layout.paddingClass} min-h-[44px] border-2 border-dashed ${styles.emptySlotBorder} rounded-lg mx-2 my-1 ${theme === 'dark' ? 'bg-slate-900/20' : 'bg-slate-50/50'}`}>
                <span className={`font-bold text-sm ${styles.emptySlotText}`}>
                    {slot.seedNumber ? `#${slot.seedNumber}` : '—'}
                </span>
            </div>
        );
    }

    return (
        <motion.div
            layout
            className={`flex items-center justify-between ${layout.paddingClass} ${layout.cardHeightClass} transition-colors duration-500 border-t-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} ${isHighlighted
                ? 'bg-amber-300'
                : isWinner
                    ? styles.winSlotBg
                    : isLoser
                        ? styles.loseSlotBg
                        : styles.cardBg
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
                    className={`font-black break-words leading-tight whitespace-normal ${isWinner
                        ? `${styles.winSlotText} ${layout.fontSizeClass}`
                        : isLoser
                            ? `text-slate-500 line-through ${layout.fontSizeClass}`
                            : `${theme === 'dark' ? 'text-white' : 'text-slate-950'} ${layout.fontSizeClass}`
                        }`}
                    animate={isHighlighted ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                    transition={isHighlighted ? { repeat: 2, duration: 0.5 } : {}}
                >
                    {slot.teamName}
                </motion.span>
            </div>

            {showScores ? (
                !readOnly && onScoreChange ? (
                    <input
                        type="number"
                        value={score ?? ''}
                        onChange={(e) => onScoreChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={`${layout.scoreInputWidth} font-black ${layout.scoreFontSize} ml-2 px-2 py-1 rounded-lg border-2 focus:ring-4 outline-none transition-colors text-center ${isWinner
                            ? theme === 'dark' ? 'bg-emerald-950 border-emerald-500 text-emerald-100 focus:ring-emerald-500' : 'bg-emerald-100 border-emerald-500 text-emerald-900 focus:ring-emerald-500'
                            : theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white focus:ring-indigo-500' : 'bg-white border-slate-400 text-slate-950 focus:ring-indigo-500 hover:border-indigo-500'
                            }`}
                        placeholder="-"
                    />
                ) : (
                    score !== undefined && score !== null && score !== '' && (
                        <div className={`font-black ${layout.scoreFontSize} ml-2 px-2 py-0.5 rounded-lg border-2 ${isWinner
                            ? theme === 'dark' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-emerald-100 border-emerald-500 text-emerald-900'
                            : theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                            }`}>
                            {score}
                        </div>
                    )
                )
            ) : null}

            {canDecide && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onWin}
                    className={`flex-shrink-0 ml-2 px-3 py-1.5 rounded-xl font-black text-xs border ${theme === 'dark'
                        ? 'bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border-indigo-850'
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200'
                        }`}
                >
                    <Trophy className="w-4 h-4" />
                </motion.button>
            )}
        </motion.div>
    );
}

// ===== Double Elimination Projection Match =====
function ProjectionMatch({
    match,
    side,
    recentWinnerId,
    onWin,
    readOnly,
    scale,
    matchRefs,
    onScoreChange,
    showScores,
    onUndo,
    styles,
    layout,
    theme,
}: {
    match: BracketMatch;
    side: 'left' | 'center' | 'right';
    recentWinnerId: string | null;
    onWin: (matchId: string, winnerId: string) => void;
    readOnly: boolean;
    scale: number;
    matchRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    onScoreChange?: (matchId: string, isSlotA: boolean, val: string) => void;
    showScores: boolean;
    onUndo?: (matchId: string) => void;
    styles: ThemeStyles;
    layout: any;
    theme: 'light' | 'dark';
}) {
    const isReady = match.status === 'ready' && match.slotA.teamId && match.slotB.teamId && !match.slotA.isBye && !match.slotB.isBye;
    const isCompleted = match.status === 'completed';
    const matchHighlight = recentWinnerId && match.winnerId === recentWinnerId;

    const headerBg = side === 'left'
        ? styles.winnersHeader
        : side === 'right'
            ? styles.losersHeader
            : styles.initialHeader;

    return (
        <motion.div
            ref={el => { matchRefs.current[match.matchId] = el; }}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 ${styles.cardBorder} ${styles.cardBg} overflow-hidden z-10 relative
                        ${matchHighlight ? 'shadow-2xl ring-4 ring-amber-400/50' : 'shadow-lg shadow-black/5'}`}
            style={{ width: layout.cardWidth }}
        >
            <div className={`px-3 py-1 flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-1.5">
                    <span className={`${layout.headerFontSizeClass} font-black tracking-[0.2em] uppercase`}>
                        {match.matchId.split('-').slice(1).join('-')}
                    </span>
                    {(match.court || match.referee) && (
                        <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px] ${
                            theme === 'dark' ? 'bg-white/10 text-slate-350' : 'bg-black/5 text-slate-700'
                        }`}>
                            {match.court && <span>{match.court}</span>}
                            {match.court && match.referee && <span>/</span>}
                            {match.referee && <span>審:{match.referee}</span>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isCompleted && <span className="text-[10px] font-bold text-emerald-500">✓ 完了</span>}
                    {isReady && !isCompleted && (
                        <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-[10px] font-bold text-amber-500"
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
                showScores={showScores}
                styles={styles}
                layout={layout}
                theme={theme}
            />

            {/* VS divider */}
            <div className={`text-center py-0.5 ${theme === 'dark' ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'} font-black text-[10px] tracking-[0.5em] border-y flex items-center justify-center relative`}>
                <span className="relative z-0">VS</span>
                {isCompleted && !readOnly && onUndo && (
                    <button 
                        onClick={() => onUndo(match.matchId)} 
                        className="absolute right-2 text-slate-400 hover:text-rose-500 p-0.5 transition-colors z-10" 
                        title="やり直し"
                    >
                        <Undo className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

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
                showScores={showScores}
                styles={styles}
                layout={layout}
                theme={theme}
            />
        </motion.div>
    );
}

// ===== Double Elimination Round Group =====
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
    showScores,
    onUndo,
    styles,
    layout,
    theme,
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
    showScores: boolean;
    onUndo?: (matchId: string) => void;
    styles: ThemeStyles;
    layout: any;
    theme: 'light' | 'dark';
}) {
    return (
        <div className={`flex flex-col ${layout.gapClass} justify-around h-full z-10 relative`}>
            <div className={`text-center text-xs font-black tracking-[0.3em] ${styles.textMuted} uppercase shrink-0 absolute -top-8 left-0 right-0`}>
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
                    showScores={showScores}
                    onUndo={onUndo}
                    styles={styles}
                    layout={layout}
                    theme={theme}
                />
            ))}
        </div>
    );
}

// ===== Section Label =====
function SectionLabel({ 
    icon, 
    label, 
    colorClass, 
    layout 
}: { 
    icon: React.ReactNode; 
    label: string; 
    colorClass: string; 
    layout: any;
}) {
    const marginClass = layout.fontSizeClass.includes('text-[11px]') ? 'mb-4 mt-2' : 'mb-8 mt-4';
    const textClass = layout.fontSizeClass.includes('text-[11px]') ? 'text-sm' : layout.fontSizeClass.includes('text-sm') ? 'text-base' : 'text-xl';
    
    return (
        <div className={`flex items-center gap-2 ${marginClass} ${colorClass}`}>
            {icon}
            <span className={`${textClass} font-black tracking-widest uppercase`}>{label}</span>
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
    showScores: defaultShowScores = false,
    onUndo,
}: BracketFullscreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [recentWinnerId, setRecentWinnerId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [renderLinesTick, setRenderLinesTick] = useState(0);
    
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [showScores, setShowScores] = useState(defaultShowScores);

    // Initial storage fetch
    useEffect(() => {
        const savedTheme = localStorage.getItem('tournament-bracket-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            setTheme(savedTheme);
        }
        const savedShowScores = localStorage.getItem('tournament-bracket-show-scores');
        if (savedShowScores !== null) {
            setShowScores(savedShowScores === 'true');
        }
    }, []);

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('tournament-bracket-theme', newTheme);
    };

    const handleShowScoresChange = (val: boolean) => {
        setShowScores(val);
        localStorage.setItem('tournament-bracket-show-scores', String(val));
    };

    const styles = themeStyles[theme];
    const layout = getLayoutSettings(bracketData.teamCount);

    const isBlocksFormat = bracketData.format === 'blocks_and_placement';

    // Auto-scale available space
    useEffect(() => {
        const recalc = () => {
            if (!contentRef.current || !containerRef.current) return;
            
            const vw = window.innerWidth - 40;
            const vh = window.innerHeight - 80;

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
                    setScale(Math.min(sx, sy, 4.0));
                    setRenderLinesTick(t => t + 1);
                }
            }
        };
        const t = setTimeout(recalc, 100);
        window.addEventListener('resize', recalc);
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', recalc);
        };
    }, [bracketData, isOpen, showScores]);

    const enterFullscreen = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen?.().catch(() => { });
        }
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(enterFullscreen, 150);
    }, [isOpen, enterFullscreen]);

    const handleWin = useCallback((matchId: string, winnerId: string) => {
        setRecentWinnerId(winnerId);
        onWin(matchId, winnerId);
        setTimeout(() => setRecentWinnerId(null), 6000);
    }, [onWin]);

    const handleScoreUpdate = useCallback((matchId: string, isSlotA: boolean, val: string) => {
        if (onScoreChange) {
            onScoreChange(matchId, isSlotA, val);
        }
    }, [onScoreChange]);

    const groupByRound = (matches: BracketMatch[]) => {
        const map = new Map<number, BracketMatch[]>();
        matches.forEach(m => {
            if (!map.has(m.round)) map.set(m.round, []);
            map.get(m.round)!.push(m);
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    };

    const handleZoomIn = () => setScale(s => Math.min(s * 1.25, 8.0));
    const handleZoomOut = () => setScale(s => Math.max(s / 1.25, 0.2));

    if (!isOpen) return null;

    const hasLosers = bracketData.losersMatches.length > 0;
    const hasWinners = bracketData.winnersMatches.length > 0;

    return (
        <div ref={containerRef} className={`fixed inset-0 z-[150] ${styles.bg} overflow-hidden flex flex-col font-sans p-4`}>

            {/* Subtle floating controls panel */}
            <div className={`absolute top-4 right-4 z-[200] flex items-center gap-2 p-1.5 rounded-2xl shadow-xl border transition-all duration-300 opacity-20 hover:opacity-100 ${styles.controlBg} ${styles.controlBorder}`}>
                <button
                    onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm border shadow-sm transition-all ${
                        theme === 'dark' 
                            ? 'bg-slate-800 text-yellow-400 border-slate-700 hover:bg-slate-700' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="テーマ切り替え"
                >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span className="hidden md:inline">{theme === 'light' ? 'ダーク背景' : 'ライト背景'}</span>
                </button>

                <button
                    onClick={() => handleShowScoresChange(!showScores)}
                    className={`px-3 py-2 rounded-xl font-bold text-sm border shadow-sm transition-all ${
                        showScores 
                            ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500' 
                            : theme === 'dark' 
                                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    得点表示: {showScores ? 'ON' : 'OFF'}
                </button>

                <div className={`flex rounded-xl shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <button onClick={handleZoomOut} className={`px-3 py-2 border-r transition-colors ${theme === 'dark' ? 'text-slate-400 border-slate-750 hover:bg-slate-750 hover:text-white' : 'text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'}`} title="縮小"><ZoomOut className="w-4 h-4" /></button>
                    <button onClick={handleZoomIn} className={`px-3 py-2 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-750 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`} title="拡大"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <button
                    onClick={enterFullscreen}
                    className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md font-bold flex items-center justify-center border ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                    title="フルスクリーン表示"
                >
                    <Maximize2 className="w-5 h-5" />
                </button>

                {!readOnly && (
                    <button
                        onClick={() => { document.exitFullscreen?.().catch(() => { }); onClose(); }}
                        className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md font-bold flex items-center justify-center border ${
                            theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-rose-950 hover:text-rose-400' : 'bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title="閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Bracket viewport */}
            <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center relative">
                <div
                    style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                    className="flex items-start gap-0 relative"
                >
                    <LayoutGroup>
                        <div ref={contentRef} className="flex flex-col items-stretch gap-8 relative">
                            {isBlocksFormat ? (
                                /* ===== FULLSCREEN RENDER BLOCKS + PLACEMENT MATCHES ===== */
                                <div className="space-y-12 p-4 min-w-[900px] w-full">
                                    {/* 1. Blocks Row */}
                                    <div className="flex justify-center gap-10">
                                        {bracketData.blocks?.map(block => {
                                            const isBlockTournament = block.type === 'tournament';
                                            return (
                                                <div key={block.id} className={`p-4 rounded-2xl border bg-slate-900/10 ${styles.cardBorder} flex flex-col gap-4 min-w-[240px]`}>
                                                    <div className="pb-1.5 border-b border-slate-700/20 flex justify-between items-center">
                                                        <h3 className={`font-black text-sm ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-850'}`}>
                                                            {block.name}
                                                            <span className="text-[9px] font-bold text-slate-500 ml-1.5">
                                                                （{block.type === 'league' ? '予選リーグ' : '予選トーナメント'}）
                                                            </span>
                                                        </h3>
                                                    </div>

                                                    {/* Block Standing table (league only) */}
                                                    {block.type === 'league' && (
                                                        <div className="w-full space-y-2">
                                                            <FullscreenBlockStandingTable standings={block.standings} styles={styles} />
                                                            <FullscreenBlockCrosstable block={block} styles={styles} theme={theme} />
                                                        </div>
                                                    )}

                                                    {/* Block Tournament Bracket or Block League Matches */}
                                                    {isBlockTournament ? (
                                                        // Render small 4-team bracket: 2 rounds
                                                        <div className="flex gap-4 items-stretch justify-around py-1.5">
                                                            {/* Round 1 (Semifinals) */}
                                                            <div className="flex flex-col justify-around gap-3">
                                                                <div className="text-[8px] font-black text-slate-450 uppercase text-center">準決勝 (R1)</div>
                                                                {block.matches.filter(m => m.type === 'semifinal').map(m => (
                                                                    <FullscreenBlockMatchCard
                                                                        key={m.matchId}
                                                                        match={m}
                                                                        onWin={handleWin}
                                                                        onUndo={onUndo}
                                                                        onScoreChange={handleScoreUpdate}
                                                                        showScores={showScores}
                                                                        readOnly={readOnly}
                                                                        styles={styles}
                                                                        theme={theme}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {/* Round 2 (Final & 3rd Place) */}
                                                            <div className="flex flex-col justify-around gap-3">
                                                                <div className="text-[8px] font-black text-slate-455 uppercase text-center">決勝・3位決定 (R2)</div>
                                                                {block.matches.filter(m => m.type === 'final' || m.type === 'third_place').map(m => (
                                                                    <FullscreenBlockMatchCard
                                                                        key={m.matchId}
                                                                        match={m}
                                                                        onWin={handleWin}
                                                                        onUndo={onUndo}
                                                                        onScoreChange={handleScoreUpdate}
                                                                        showScores={showScores}
                                                                        readOnly={readOnly}
                                                                        styles={styles}
                                                                        theme={theme}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Render league matches in list
                                                        <div className="flex flex-col gap-2">
                                                            {block.matches.map(m => (
                                                                <FullscreenBlockMatchCard
                                                                    key={m.matchId}
                                                                    match={m}
                                                                    onWin={handleWin}
                                                                    onUndo={onUndo}
                                                                    onScoreChange={handleScoreUpdate}
                                                                    showScores={showScores}
                                                                    readOnly={readOnly}
                                                                    styles={styles}
                                                                    theme={theme}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 2. Placement groups row */}
                                    <div className="flex justify-center gap-10 pt-4 border-t border-dashed border-slate-700/20">
                                        {bracketData.placementGroups?.map(group => {
                                            const hasMatches = group.matches.length > 0;
                                            return (
                                                <div key={group.id} className={`p-4 rounded-2xl border bg-emerald-500/5 ${styles.cardBorder} flex flex-col gap-4 min-w-[240px]`}>
                                                    <div className="pb-1.5 border-b border-slate-700/20 flex items-center justify-between">
                                                        <h3 className={`font-black text-sm flex items-center gap-1.5 ${theme === 'dark' ? 'text-emerald-450' : 'text-emerald-850'}`}>
                                                            <Trophy className="w-3.5 h-3.5" />
                                                            {group.name}
                                                        </h3>
                                                    </div>

                                                    {/* Standing list if placement group has matches */}
                                                    {hasMatches && group.standings && group.standings.length > 0 && (
                                                        <div className="w-full space-y-2">
                                                            <FullscreenBlockStandingTable standings={group.standings} styles={styles} />
                                                            <FullscreenPlacementCrosstable group={group} styles={styles} theme={theme} />
                                                        </div>
                                                    )}

                                                    {/* Matches */}
                                                    <div className="flex flex-col gap-2">
                                                        {hasMatches ? (
                                                            group.matches.map(m => (
                                                                <FullscreenBlockMatchCard
                                                                    key={m.matchId}
                                                                    match={m}
                                                                    onWin={handleWin}
                                                                    onUndo={onUndo}
                                                                    onScoreChange={handleScoreUpdate}
                                                                    showScores={showScores}
                                                                    readOnly={readOnly}
                                                                    styles={styles}
                                                                    theme={theme}
                                                                />
                                                            ))
                                                        ) : (
                                                            <p className="text-[10px] text-slate-450 italic text-center py-4">最終決定（自動順位確定）</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* ===== FULLSCREEN RENDER DOUBLE ELIMINATION ===== */
                                <div className="flex flex-row items-stretch gap-0 relative">
                                    {/* SVG Lines */}
                                    {renderLinesTick === renderLinesTick && (
                                        <BracketLines 
                                            bracketData={bracketData} 
                                            matchRefs={matchRefs} 
                                            contentRef={contentRef} 
                                            scale={scale} 
                                            styles={styles}
                                        />
                                    )}

                                    {/* Winners Column (Left, Flows right-to-left) */}
                                    {hasWinners && (
                                        <div className="flex-shrink-0 px-8 z-10">
                                            <SectionLabel
                                                icon={<Crown className="w-6 h-6 text-emerald-500" />}
                                                label="WINNERS"
                                                colorClass="text-emerald-600 justify-center"
                                                layout={layout}
                                            />
                                            <div className={`flex ${layout.columnGapClass} items-stretch flex-row-reverse h-full pt-8`}>
                                                {groupByRound(bracketData.winnersMatches).map(([rn, ms]) => (
                                                    <RoundGroup 
                                                        key={rn} 
                                                        roundNum={rn} 
                                                        matches={ms} 
                                                        side="left"
                                                        recentWinnerId={recentWinnerId} 
                                                        onWin={handleWin}
                                                        readOnly={readOnly} 
                                                        scale={scale} 
                                                        matchRefs={matchRefs}
                                                        onScoreChange={handleScoreUpdate} 
                                                        showScores={showScores}
                                                        onUndo={onUndo}
                                                        styles={styles}
                                                        layout={layout}
                                                        theme={theme}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasWinners && <div className={`${layout.columnGapClass} shrink-0`} />}

                                    {/* Initial Column (Center) */}
                                    <div className={`flex-shrink-0 px-8 z-10 border-x-2 border-dashed ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <SectionLabel
                                            icon={<Zap className="w-6 h-6 text-indigo-500" />}
                                            label="INITIAL"
                                            colorClass="text-indigo-600 justify-center"
                                            layout={layout}
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
                                                    onScoreChange={handleScoreUpdate}
                                                    showScores={showScores}
                                                    onUndo={onUndo}
                                                    styles={styles}
                                                    layout={layout}
                                                    theme={theme}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {hasLosers && <div className={`${layout.columnGapClass} shrink-0`} />}

                                    {/* Losers Column (Right, Flows left-to-right) */}
                                    {hasLosers && (
                                        <div className="flex-shrink-0 px-8 z-10">
                                            <SectionLabel
                                                icon={<Skull className="w-6 h-6 text-rose-500" />}
                                                label="LOSERS"
                                                colorClass="text-rose-600 justify-center"
                                                layout={layout}
                                            />
                                            <div className={`flex ${layout.columnGapClass} items-stretch h-full pt-8`}>
                                                {groupByRound(bracketData.losersMatches).map(([rn, ms]) => (
                                                    <RoundGroup 
                                                        key={rn} 
                                                        roundNum={rn} 
                                                        matches={ms} 
                                                        side="right"
                                                        recentWinnerId={recentWinnerId} 
                                                        onWin={handleWin}
                                                        readOnly={readOnly} 
                                                        scale={scale} 
                                                        matchRefs={matchRefs}
                                                        onScoreChange={handleScoreUpdate} 
                                                        showScores={showScores}
                                                        onUndo={onUndo}
                                                        styles={styles}
                                                        layout={layout}
                                                        theme={theme}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </LayoutGroup>
                </div>
            </div>
        </div>
    );
}
