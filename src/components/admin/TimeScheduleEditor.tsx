"use client";

import React, { useState, useEffect } from 'react';
import { Match, ScheduleEvent, TeamEntry } from '@/lib/types';
import { Loader2, Save, Plus, Edit2, Trash2, X } from 'lucide-react';

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
        if (!id) return 'TBD';
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
                </div>
            </div>

            <div className="overflow-x-auto">
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
                                    <td colSpan={2} className="px-4 py-3 text-center bg-yellow-900/20 border-l border-slate-800 cursor-pointer hover:bg-yellow-900/30 transition-colors" onClick={() => openEdit(slot.fullEvent!)}>
                                        <div className="font-bold text-yellow-500">{slot.fullEvent.title}</div>
                                        <div className="text-xs text-yellow-600/70">{slot.fullEvent.startTime} - {slot.fullEvent.endTime}</div>
                                    </td>
                                ) : (
                                    <>
                                        {/* Court A */}
                                        <td className="px-4 py-2 border-l border-slate-800 align-top">
                                            <CellContent
                                                item={slot.courtA}
                                                getTeamName={getTeamName}
                                                entries={entries}
                                                onEdit={() => slot.courtA && openEdit(slot.courtA)}
                                            />
                                        </td>

                                        {/* Court B */}
                                        <td className="px-4 py-2 border-l border-slate-800 align-top">
                                            <CellContent
                                                item={slot.courtB}
                                                getTeamName={getTeamName}
                                                entries={entries}
                                                onEdit={() => slot.courtB && openEdit(slot.courtB)}
                                            />
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {scheduleSlots.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-slate-500">
                                    スケジュールがありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CellContent({ item, getTeamName, entries, onEdit }: { item: Match | ScheduleEvent | undefined, getTeamName: (id: string) => string, entries: TeamEntry[], onEdit: () => void }) {
    if (!item) return <div className="h-full min-h-[40px] border border-dashed border-slate-800 rounded bg-slate-900/30"></div>;

    // Is it a Schedule Event? (Check for 'type' property)
    if ('type' in item) {
        return (
            <div className="bg-slate-800 border border-slate-700 p-2 rounded text-center cursor-pointer hover:bg-slate-700 transition-colors" onClick={onEdit}>
                <div className="font-bold text-slate-300 text-xs">{item.title}</div>
            </div>
        );
    }

    // It is a Match
    const match = item as Match;
    const refereeTeam = entries.find(e => e.id === match.refereeTeamId);

    return (
        <div className="flex flex-col gap-1 cursor-pointer hover:bg-slate-800 p-2 rounded -m-1 transition-colors border border-transparent hover:border-slate-700" onClick={onEdit}>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                <span className="font-mono text-slate-400">{match.matchNumber || `試合 ${match.id.slice(0, 4)}`}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </div>
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-right font-semibold text-slate-300 truncate text-xs">
                    {getTeamName(match.teamIdA)}
                </div>
                <div className="text-slate-600 text-[10px]">vs</div>
                <div className="flex-1 text-left font-semibold text-slate-300 truncate text-xs">
                    {getTeamName(match.teamIdB)}
                </div>
            </div>
            {/* Referee Section */}
            <div className="mt-1 pt-1 border-t border-slate-800 text-xs flex items-center justify-center gap-2 text-slate-500">
                <span className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-400">審判/TO</span>
                <span className={refereeTeam ? "text-slate-400 font-medium text-[10px]" : "text-slate-600 italic text-[10px]"}>
                    {refereeTeam ? refereeTeam.teamName : "未割当"}
                </span>
            </div>
        </div>
    );
}

function EditForm({ item, entries, onSave, onCancel }: { item: Match | ScheduleEvent, entries: TeamEntry[], onSave: (item: any) => void, onCancel: () => void }) {
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

            <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-white/5 font-medium">
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
    );
}
