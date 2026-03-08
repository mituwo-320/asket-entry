"use client";

import React, { useState, useEffect } from 'react';
import { Match, ScheduleEvent, TeamEntry } from '@/lib/types';
import { Loader2, Save, Plus, Edit2, Trash2, X } from 'lucide-react';

import ScheduleGeneratorModal from './ScheduleGeneratorModal';

interface TimeScheduleEditorProps {
    entries: TeamEntry[];
    matches: Match[];
    refreshData: () => void;
}

interface TimeSlot {
    time: string;
    courtA?: Match | ScheduleEvent;
    courtB?: Match | ScheduleEvent;
    fullEvent?: ScheduleEvent;
}

export default function TimeScheduleEditor({ entries, matches, refreshData }: TimeScheduleEditorProps) {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [showTeamSidebar, setShowTeamSidebar] = useState(false);
    const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
    const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

    // Calculate match counts for teams
    const teamMatchCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        entries.forEach(e => counts[e.id] = 0);
        matches.forEach(m => {
            if (m.teamIdA) counts[m.teamIdA] = (counts[m.teamIdA] || 0) + 1;
            if (m.teamIdB) counts[m.teamIdB] = (counts[m.teamIdB] || 0) + 1;
        });
        return counts;
    }, [matches, entries]);

    // Fetch Events on Mount
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/schedule/events?tournamentId=2024-Spring');
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error("Failed to fetch events", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get Team Name
    const getTeamName = (id: string) => {
        if (!id) return '';
        const team = entries.find(e => e.id === id);
        return team ? team.teamName : (id === 'Bye' ? 'Bye' : id);
    };

    // Process Data into Slots
    const processSchedule = (): TimeSlot[] => {
        const slots: Map<string, TimeSlot> = new Map();

        // 1. Add Matches
        matches.forEach(match => {
            const time = match.time || '00:00';
            let slot = slots.get(time) || { time };

            if (match.court === 'B') {
                slot.courtB = match;
            } else {
                slot.courtA = match; // Default to A
            }
            slots.set(time, slot);
        });

        // 2. Add Events
        events.forEach(event => {
            const time = event.startTime;
            let slot = slots.get(time) || { time };

            if (event.court === 'ALL') {
                slot.fullEvent = event;
            } else if (event.court === 'B') {
                slot.courtB = event;
            } else {
                slot.courtA = event;
            }
            slots.set(time, slot);
        });

        // Sort by time
        return Array.from(slots.values()).sort((a, b) => a.time.localeCompare(b.time));
    };

    const scheduleSlots = processSchedule();

    const [editingItem, setEditingItem] = useState<Match | ScheduleEvent | null>(null);

    const openEdit = (item: Match | ScheduleEvent) => {
        setEditingItem(item);
        setIsEditModalOpen(true);
    };

    const handleSaveItem = async (updatedItem: Match | ScheduleEvent) => {
        setLoading(true);
        try {
            if ('type' in updatedItem) {
                // It's an Event
                const res = await fetch('/api/schedule/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events: [updatedItem] })
                });
            } else {
                // It's a Match
                const res = await fetch('/api/admin/match/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ match: updatedItem })
                });
            }
            // Refresh
            await Promise.all([refreshData(), fetchEvents()]);
            setIsEditModalOpen(false);
            setEditingItem(null);
        } catch (e) {
            console.error(e);
            alert('Updated failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }

        // If it's a newly created event that hasn't been saved yet, just close the modal
        if (eventId.startsWith('evt_') && !events.some(ev => ev.id === eventId)) {
            setIsEditModalOpen(false);
            setEditingItem(null);
            return;
        }

        if (!confirm('このイベントを削除しますか？')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/schedule/events?id=${eventId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await fetchEvents();
                setIsEditModalOpen(false);
                setEditingItem(null);
            } else {
                alert('削除に失敗しました');
            }
        } catch (error) {
            console.error(error);
            alert('削除エラー');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSchedule = async (config: any) => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/schedule/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: '2024-Spring',
                    config // We will pass this to the API
                })
            });
            if (res.ok) {
                await Promise.all([refreshData(), fetchEvents()]);
            } else {
                const data = await res.json();
                alert(`エラー: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('生成に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDropTeam = async (matchId: string, role: 'A' | 'B' | 'referee', droppedTeamId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        let updatedMatch = { ...match };
        if (role === 'A') updatedMatch.teamIdA = droppedTeamId;
        if (role === 'B') updatedMatch.teamIdB = droppedTeamId;
        if (role === 'referee') updatedMatch.refereeTeamId = droppedTeamId;

        await handleSaveItem(updatedMatch);
    };

    // Render Logic
    return (
        <div className="bg-slate-900/40 rounded-2xl shadow-sm border border-white/5 overflow-hidden relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/20">
                <h3 className="text-lg font-bold text-white tracking-tight">タイムスケジュール</h3>
                <div className="flex gap-3">
                    <button onClick={() => { refreshData(); fetchEvents(); }} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            // Create a new blank event
                            const newEvent: ScheduleEvent = {
                                id: `evt_${Date.now()}`,
                                tournamentId: '2024-Spring',
                                type: 'break',
                                title: '新規イベント',
                                startTime: '12:00',
                                court: 'ALL'
                            };
                            openEdit(newEvent);
                        }}
                        className="flex items-center gap-1.5 font-bold text-sm bg-indigo-600/90 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 border border-indigo-500/50"
                    >
                        <Plus className="w-4 h-4" /> イベント追加
                    </button>
                    <button
                        onClick={() => setIsGeneratorModalOpen(true)}
                        className="flex items-center gap-1.5 font-bold text-sm bg-gradient-to-r from-pink-600 to-rose-500 text-white px-4 py-2 rounded-xl hover:from-pink-500 hover:to-rose-400 transition-all shadow-lg"
                    >
                        自動生成
                    </button>
                    <button
                        onClick={() => setShowTeamSidebar(!showTeamSidebar)}
                        className={`flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-xl transition-all border ${showTeamSidebar ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                    >
                        チーム配置
                    </button>
                </div>
            </div>

            <div className="flex">
                {/* Main Schedule Table */}
                <div className={`overflow-x-auto transition-all ${showTeamSidebar ? 'w-2/3 lg:w-3/4' : 'w-full'}`}>
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="bg-slate-950/30 text-slate-400 font-bold text-[11px] tracking-wider uppercase border-b border-white/5">
                            <tr>
                                <th className="px-4 py-4 w-28 pl-6">時間</th>
                                <th className="px-4 py-4 text-center border-l border-white/5 bg-orange-900/5 text-orange-400/80">Aコート</th>
                                <th className="px-4 py-4 text-center border-l border-white/5 bg-blue-900/5 text-blue-400/80">Bコート</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {scheduleSlots.map((slot, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-4 py-3 font-mono text-slate-400 font-medium align-top bg-slate-900/50">
                                        {slot.time}
                                    </td>

                                    {slot.fullEvent ? (
                                        <td colSpan={2} className="px-4 py-3 text-center bg-yellow-900/20 border-l border-slate-800 cursor-pointer hover:bg-yellow-900/30 transition-colors relative group" onClick={() => openEdit(slot.fullEvent!)}>
                                            <div className="font-bold text-yellow-500">{slot.fullEvent.title}</div>
                                            <div className="text-xs text-yellow-600/70">{slot.fullEvent.startTime} - {slot.fullEvent.endTime}</div>
                                            <button
                                                onClick={(e) => handleDeleteEvent(slot.fullEvent!.id, e)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-rose-500/10"
                                                title="削除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    ) : (
                                        <>
                                            {/* Court A */}
                                            <td className="px-4 py-2 border-l border-slate-800 align-top">
                                                <CellContent
                                                    item={slot.courtA}
                                                    previousMatch={idx > 0 && scheduleSlots[idx - 1].courtA && !('type' in scheduleSlots[idx - 1].courtA!) ? scheduleSlots[idx - 1].courtA as Match : undefined}
                                                    getTeamName={getTeamName}
                                                    entries={entries}
                                                    onEdit={() => slot.courtA && openEdit(slot.courtA)}
                                                    onDeleteEvent={(eventId, e) => handleDeleteEvent(eventId, e)}
                                                    onDropTeam={handleDropTeam}
                                                    isDragActive={showTeamSidebar}
                                                    hoveredTeamId={hoveredTeamId}
                                                />
                                            </td>

                                            {/* Court B */}
                                            <td className="px-4 py-2 border-l border-slate-800 align-top">
                                                <CellContent
                                                    item={slot.courtB}
                                                    previousMatch={idx > 0 && scheduleSlots[idx - 1].courtB && !('type' in scheduleSlots[idx - 1].courtB!) ? scheduleSlots[idx - 1].courtB as Match : undefined}
                                                    getTeamName={getTeamName}
                                                    entries={entries}
                                                    onEdit={() => slot.courtB && openEdit(slot.courtB)}
                                                    onDeleteEvent={(eventId, e) => handleDeleteEvent(eventId, e)}
                                                    onDropTeam={handleDropTeam}
                                                    isDragActive={showTeamSidebar}
                                                    hoveredTeamId={hoveredTeamId}
                                                />
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {scheduleSlots.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500">
                                        スケジュールがありません。自動生成を実行してください。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Draggable Team Sidebar */}
                {showTeamSidebar && (
                    <div className="w-1/3 lg:w-1/4 border-l border-white/5 bg-slate-900/50 p-4 sticky top-0 max-h-[80vh] overflow-y-auto">
                        <div className="text-sm font-bold text-white mb-4 tracking-tight">ドラッグして配置</div>
                        <div className="space-y-2">
                            {entries.map(team => {
                                const matchCount = teamMatchCounts[team.id] || 0;
                                return (
                                    <div
                                        key={team.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('teamId', team.id);
                                            setDraggedTeamId(team.id);
                                        }}
                                        onDragEnd={() => setDraggedTeamId(null)}
                                        onMouseEnter={() => setHoveredTeamId(team.id)}
                                        onMouseLeave={() => setHoveredTeamId(null)}
                                        className={`p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-grab active:cursor-grabbing hover:border-indigo-500 hover:bg-slate-750 transition-colors shadow-sm ${draggedTeamId === team.id ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-sm text-slate-200">{team.teamName}</div>
                                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${matchCount === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {matchCount}試合
                                            </div>
                                        </div>
                                        {team.group && (
                                            <div className="text-[10px] text-slate-500 mt-1 uppercase">Group: <span className="text-indigo-400 font-bold">{team.group}</span></div>
                                        )}
                                    </div>
                                );
                            })}
                            <div
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('teamId', '')}
                                className="p-3 bg-slate-900/80 rounded-lg border border-dashed border-slate-600 cursor-grab text-center text-slate-500 text-sm font-bold hover:border-slate-400 transition-colors"
                            >
                                [クリア / 未定にする]
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generator Modal */}
            {isGeneratorModalOpen && (
                <ScheduleGeneratorModal
                    onClose={() => setIsGeneratorModalOpen(false)}
                    onGenerate={handleGenerateSchedule}
                />
            )}

            {/* Edit Modal Overlay */}
            {isEditModalOpen && editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-lg w-full relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-900/95 backdrop-blur z-20">
                            <h3 className="text-xl font-bold text-white tracking-tight">予定の編集</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <EditForm
                                item={editingItem}
                                entries={entries}
                                onSave={handleSaveItem}
                                onCancel={() => setIsEditModalOpen(false)}
                                onDelete={('type' in editingItem) ? () => handleDeleteEvent(editingItem.id) : undefined}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CellContent({ item, previousMatch, getTeamName, entries, onEdit, onDeleteEvent, onDropTeam, isDragActive, hoveredTeamId }: { item: Match | ScheduleEvent | undefined, previousMatch?: Match, getTeamName: (id: string) => string, entries: TeamEntry[], onEdit: () => void, onDeleteEvent?: (eventId: string, e: React.MouseEvent) => void, onDropTeam: (matchId: string, role: 'A' | 'B' | 'referee', teamId: string) => void, isDragActive: boolean, hoveredTeamId?: string | null }) {
    if (!item) return <div className="h-full min-h-[40px] border border-dashed border-slate-800 rounded bg-slate-900/30 transition-colors"></div>;

    // Is it a Schedule Event?
    if ('type' in item) {
        return (
            <div className="relative group bg-slate-800 border border-slate-700 p-2 rounded text-center cursor-pointer hover:bg-slate-700 transition-colors" onClick={onEdit}>
                <div className="font-bold text-slate-300 text-xs pr-4">{item.title}</div>
                {item.id && !item.id.startsWith('evt_new') && onDeleteEvent && (
                    <button
                        onClick={(e) => onDeleteEvent(item.id, e)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-rose-500/10"
                        title="削除"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    }

    // It is a Match
    const match = item as Match;
    const refereeTeam = entries.find(e => e.id === match.refereeTeamId);

    // Auto calculate referee if empty and we have a previous match
    let autoRefereeText = "";
    let isAutoReferee = false;

    if (!match.refereeTeamId && previousMatch) {
        const teamA = previousMatch.teamIdA ? getTeamName(previousMatch.teamIdA) : "";
        const teamB = previousMatch.teamIdB ? getTeamName(previousMatch.teamIdB) : "";

        if (teamA && teamB) {
            autoRefereeText = `${teamA} & ${teamB}`;
            isAutoReferee = true;
        } else if (teamA) {
            autoRefereeText = teamA;
            isAutoReferee = true;
        } else if (teamB) {
            autoRefereeText = teamB;
            isAutoReferee = true;
        }
    }

    const handleDrop = (e: React.DragEvent, role: 'A' | 'B' | 'referee') => {
        e.preventDefault();
        e.currentTarget.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
        const teamId = e.dataTransfer.getData('teamId');
        if (teamId !== undefined) {
            onDropTeam(match.id, role, teamId);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
    };

    const isHoverable = isDragActive ? "border border-dashed border-slate-600 hover:border-indigo-400 hover:bg-slate-800 transition-all rounded p-1 min-h-[28px] flex items-center justify-center" : "min-h-[28px] flex items-center justify-center transition-all rounded p-1";

    const isTeamAHovered = hoveredTeamId === match.teamIdA;
    const isTeamBHovered = hoveredTeamId === match.teamIdB;
    const isRefereeHovered = hoveredTeamId === match.refereeTeamId;

    const highlightClass = "ring-2 ring-amber-400 bg-amber-400/20 !border-amber-400";

    // Status visual styles
    const isFinished = match.status === 'finished';
    const cellClass = isFinished ? "opacity-70 grayscale-[30%] bg-slate-950" : "";

    return (
        <div className={`flex flex-col gap-1 rounded -m-1 transition-colors border border-transparent ${cellClass}`}>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1 px-2 pt-2 cursor-pointer hover:text-indigo-400 transition-colors" onClick={onEdit}>
                <span className="font-mono flex items-center gap-1">
                    {match.matchNumber || `試合 ${match.id.slice(0, 4)}`}
                    {isFinished && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1 rounded flex items-center gap-0.5">✓ 完了</span>}
                </span>
                <Edit2 className="w-3 h-3" />
            </div>
            <div className="flex items-center justify-between gap-1 px-1">
                <div
                    className={`relative group flex-1 text-center font-semibold text-xs ${isHoverable} ${!match.teamIdA ? (isDragActive ? 'bg-indigo-900/20 animate-pulse border-indigo-500/30' : 'bg-slate-900/50') : 'hover:bg-slate-800'} ${isTeamAHovered ? highlightClass : 'text-slate-300'}`}
                    onDragOver={isDragActive ? handleDragOver : undefined}
                    onDragLeave={isDragActive ? handleDragLeave : undefined}
                    onDrop={isDragActive ? (e) => handleDrop(e, 'A') : undefined}
                    title={getTeamName(match.teamIdA) || "ドラッグしてチームAを割り当て"}
                >
                    <span className="truncate w-full pr-4">{getTeamName(match.teamIdA) || <span className={`text-[10px] font-normal tracking-widest ${isTeamAHovered ? 'text-amber-200' : 'text-slate-600'}`}>未定</span>}</span>
                    {match.teamIdA && (
                        <button onClick={(e) => { e.stopPropagation(); onDropTeam(match.id, 'A', ''); }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-rose-500/10" title="未定に戻す">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div className="text-slate-600 text-[10px] w-4 text-center">vs</div>
                <div
                    className={`relative group flex-1 text-center font-semibold text-xs ${isHoverable} ${!match.teamIdB ? (isDragActive ? 'bg-indigo-900/20 animate-pulse border-indigo-500/30' : 'bg-slate-900/50') : 'hover:bg-slate-800'} ${isTeamBHovered ? highlightClass : 'text-slate-300'}`}
                    onDragOver={isDragActive ? handleDragOver : undefined}
                    onDragLeave={isDragActive ? handleDragLeave : undefined}
                    onDrop={isDragActive ? (e) => handleDrop(e, 'B') : undefined}
                    title={getTeamName(match.teamIdB) || "ドラッグしてチームBを割り当て"}
                >
                    <span className="truncate w-full pr-4">{getTeamName(match.teamIdB) || <span className={`text-[10px] font-normal tracking-widest ${isTeamBHovered ? 'text-amber-200' : 'text-slate-600'}`}>未定</span>}</span>
                    {match.teamIdB && (
                        <button onClick={(e) => { e.stopPropagation(); onDropTeam(match.id, 'B', ''); }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-rose-500/10" title="未定に戻す">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            {/* Referee Section */}
            <div className={`relative group mt-1 pt-1 border-t border-slate-800/50 text-xs flex items-center justify-center gap-2 text-slate-500 mx-1 pb-1 ${isHoverable} ${!match.refereeTeamId && !isAutoReferee ? (isDragActive ? 'bg-indigo-900/10 animate-pulse border-indigo-500/20' : 'bg-slate-900/30') : 'hover:bg-slate-800/50'} ${isRefereeHovered ? highlightClass : ''}`}
                onDragOver={isDragActive ? handleDragOver : undefined}
                onDragLeave={isDragActive ? handleDragLeave : undefined}
                onDrop={isDragActive ? (e) => handleDrop(e, 'referee') : undefined}
                title="ドラッグして審判チームを割り当て"
            >
                <span className={`px-1 py-0.5 rounded text-[10px] shrink-0 ${isRefereeHovered ? 'bg-amber-500/80 text-white' : 'bg-slate-800/80 text-slate-400'}`}>審判/TO</span>
                <span className={`truncate w-full text-left pr-4 flex items-center gap-1 ${refereeTeam ? (isRefereeHovered ? "text-amber-900 font-bold text-[10px]" : "text-slate-400 font-medium text-[10px]") : (isRefereeHovered ? "text-amber-900/50" : "text-slate-600 font-normal tracking-widest text-[10px]")}`}>
                    {refereeTeam ? refereeTeam.teamName : (isAutoReferee ? <span className="text-teal-400 font-medium text-[9px] truncate" title="前試合から自動割当">{autoRefereeText} <span className="inline-block px-1 bg-teal-500/20 text-teal-300 rounded text-[8px] ml-1 shrink-0">自動</span></span> : "未定")}
                </span>
                {match.refereeTeamId && (
                    <button onClick={(e) => { e.stopPropagation(); onDropTeam(match.id, 'referee', ''); }} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-rose-500/10" title="未定に戻す">
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

function EditForm({ item, entries, onSave, onCancel, onDelete }: { item: Match | ScheduleEvent, entries: TeamEntry[], onSave: (item: any) => void, onCancel: () => void, onDelete?: () => void }) {
    const [formData, setFormData] = useState<any>({ ...item });

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const isEvent = 'type' in formData;

    const inputClass = "w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner";
    const labelClass = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>開始時間</label>
                    <input
                        type="time"
                        value={formData.time || formData.startTime || ''}
                        onChange={(e) => isEvent ? handleChange('startTime', e.target.value) : handleChange('time', e.target.value)}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className={labelClass}>コート</label>
                    <select
                        value={formData.court || ''}
                        onChange={(e) => handleChange('court', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">未定</option>
                        <option value="A">Aコート</option>
                        <option value="B">Bコート</option>
                        {isEvent && <option value="ALL">全体</option>}
                    </select>
                </div>
            </div>

            {isEvent ? (
                // Event Fields
                <>
                    <div>
                        <label className={labelClass}>イベント名</label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>終了時間(目安)</label>
                        <input
                            type="time"
                            value={formData.endTime || ''}
                            onChange={(e) => handleChange('endTime', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>タイプ</label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className={inputClass}
                        >
                            <option value="ceremony">開会式/閉会式</option>
                            <option value="break">休憩</option>
                            <option value="match">試合(特殊)</option>
                            <option value="other">その他</option>
                        </select>
                    </div>
                </>
            ) : (
                // Match Fields
                <>
                    <div>
                        <label className={labelClass}>試合番号 (例: A-1)</label>
                        <input
                            type="text"
                            value={formData.matchNumber || ''}
                            onChange={(e) => handleChange('matchNumber', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>審判/TOチーム</label>
                        <select
                            value={formData.refereeTeamId || ''}
                            onChange={(e) => handleChange('refereeTeamId', e.target.value)}
                            className={inputClass}
                        >
                            <option value="">未割当</option>
                            {entries.map(entry => (
                                <option key={entry.id} value={entry.id}>{entry.teamName}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            <div className="pt-6 mt-4 flex items-center justify-between border-t border-white/5 font-medium">
                <div>
                    {isEvent && onDelete && (
                        <button
                            onClick={onDelete}
                            className="px-4 py-2.5 text-rose-400 font-bold hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> 削除
                        </button>
                    )}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onSave(formData)}
                        className="px-6 py-2.5 bg-indigo-600/90 text-white font-bold rounded-xl hover:bg-indigo-500 flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 border border-indigo-500/50"
                    >
                        <Save className="w-4 h-4" /> 保存
                    </button>
                </div>
            </div>
        </div>
    );
}
