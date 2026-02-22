"use client";

import { useState, useEffect } from "react";
import { TeamEntry } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loader2, Save, Shuffle, Trash2, Users, Plus, GripVertical } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface GroupManagerProps {
    entries: TeamEntry[];
    onSave: () => void;
}

export default function GroupManager({ entries, onSave }: GroupManagerProps) {
    const [localEntries, setLocalEntries] = useState<TeamEntry[]>([]);
    const [groupCount, setGroupCount] = useState(4);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        setLocalEntries(JSON.parse(JSON.stringify(entries))); // Deep copy
        setHasUnsavedChanges(false);
    }, [entries]);

    const groups = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...

    const getGroupedEntries = () => {
        const grouped: { [key: string]: TeamEntry[] } = {};
        groups.forEach(g => grouped[g] = []);
        grouped['Unassigned'] = [];

        localEntries.forEach(entry => {
            const g = entry.group && groups.includes(entry.group) ? entry.group : 'Unassigned';
            grouped[g].push(entry);
        });
        return grouped;
    };

    const groupedData = getGroupedEntries();

    const handleAutoAssign = () => {
        if (!confirm("現在のグループ分けをリセットし、自動的に振り分けますか？")) return;

        const shuffled = [...localEntries].sort(() => Math.random() - 0.5);
        const newEntries = shuffled.map((entry, index) => ({
            ...entry,
            group: groups[index % groupCount]
        }));

        setLocalEntries(newEntries);
        setHasUnsavedChanges(true);
    };

    const handleMove = (entryId: string, targetGroup: string) => {
        setLocalEntries(prev => prev.map(e => {
            if (e.id === entryId) {
                return { ...e, group: targetGroup === 'Unassigned' ? '' : targetGroup };
            }
            return e;
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates = localEntries.map(e => ({
                entryId: e.id,
                group: e.group
            }));

            const res = await fetch('/api/admin/groups/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groups: updates })
            });

            if (res.ok) {
                alert("保存しました");
                setHasUnsavedChanges(false);
                onSave(); // Refresh parent
            } else {
                throw new Error("Failed to save");
            }
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, entryId: string) => {
        e.dataTransfer.setData("entryId", entryId);
    };

    const handleDrop = (e: React.DragEvent, group: string) => {
        e.preventDefault();
        const entryId = e.dataTransfer.getData("entryId");
        if (entryId) {
            handleMove(entryId, group);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };

    // Color palette for groups
    const groupColors = [
        { name: 'Red', bg: 'bg-red-950/30', border: 'border-red-500/30', text: 'text-red-400', headerBg: 'bg-red-900/20' },
        { name: 'Blue', bg: 'bg-blue-950/30', border: 'border-blue-500/30', text: 'text-blue-400', headerBg: 'bg-blue-900/20' },
        { name: 'Green', bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', text: 'text-emerald-400', headerBg: 'bg-emerald-900/20' },
        { name: 'Yellow', bg: 'bg-amber-950/30', border: 'border-amber-500/30', text: 'text-amber-400', headerBg: 'bg-amber-900/20' },
        { name: 'Purple', bg: 'bg-purple-950/30', border: 'border-purple-500/30', text: 'text-purple-400', headerBg: 'bg-purple-900/20' },
        { name: 'Pink', bg: 'bg-pink-950/30', border: 'border-pink-500/30', text: 'text-pink-400', headerBg: 'bg-pink-900/20' },
        { name: 'Cyan', bg: 'bg-cyan-950/30', border: 'border-cyan-500/30', text: 'text-cyan-400', headerBg: 'bg-cyan-900/20' },
        { name: 'Orange', bg: 'bg-orange-950/30', border: 'border-orange-500/30', text: 'text-orange-400', headerBg: 'bg-orange-900/20' },
    ];

    const getGroupColor = (index: number) => groupColors[index % groupColors.length];

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/20 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-950/50 shadow-inner rounded-xl p-1.5 border border-white/5">
                        <span className="text-sm font-bold text-slate-400 px-3 uppercase tracking-wider">グループ数</span>
                        <input
                            type="number"
                            min={1}
                            max={8}
                            value={groupCount}
                            onChange={(e) => setGroupCount(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                            className="w-14 bg-slate-800/80 rounded border border-white/10 text-white text-center font-black focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 py-1"
                        />
                    </div>
                    <div className="text-sm font-bold text-slate-500 tracking-wider">
                        TOTAL: <span className="text-white text-base ml-1">{localEntries.length}</span> TEAMS
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={handleAutoAssign} size="sm" className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-bold border border-white/5">
                        <Shuffle className="w-4 h-4 mr-2" /> 自動振り分け
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={hasUnsavedChanges
                            ? "bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25 active:scale-95 border border-indigo-500/50 transition-all"
                            : "bg-slate-800/50 text-slate-500 font-bold border border-white/5 cursor-not-allowed"}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        変更を保存
                    </Button>
                </div>
            </div>

            {/* Board */}
            <LayoutGroup>
                <div className="flex gap-6 overflow-x-auto pb-6">
                    {/* Unassigned Column */}
                    <div className="flex-shrink-0 w-80 flex flex-col gap-3">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-slate-400 font-black tracking-wider flex items-center gap-2 uppercase">
                                未割り当て
                                <span className="bg-slate-800 border border-white/5 px-3 py-0.5 rounded-full text-[10px] text-slate-400 font-bold">{groupedData['Unassigned'].length}</span>
                            </h3>
                        </div>
                        <div
                            className="flex-1 bg-slate-900/40 border-2 border-dashed border-slate-700/50 rounded-2xl p-4 min-h-[200px] transition-colors hover:border-slate-600/50 shadow-inner"
                            onDrop={(e) => handleDrop(e, 'Unassigned')}
                            onDragOver={handleDragOver}
                        >
                            <AnimatePresence>
                                {groupedData['Unassigned'].map(entry => (
                                    <TeamCard key={entry.id} entry={entry} onDragStart={handleDragStart} colorClass="bg-slate-800/80 border-white/10 text-slate-300" />
                                ))}
                            </AnimatePresence>
                            {groupedData['Unassigned'].length === 0 && (
                                <div className="h-full flex items-center justify-center text-slate-600 text-sm py-10">
                                    全てのチームが割り当て済み
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Group Columns */}
                    {groups.map((group, index) => {
                        const colors = getGroupColor(index);
                        return (
                            <div key={group} className="flex-shrink-0 w-80 flex flex-col gap-3">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className={`font-black tracking-widest flex items-center gap-2 ${colors.text} drop-shadow-sm`}>
                                        GROUP {group}
                                        <span className={`px-3 py-0.5 rounded-full text-[10px] text-white font-bold bg-slate-800/80 border border-white/10 shadow-sm`}>{groupedData[group].length}</span>
                                    </h3>
                                </div>
                                <div
                                    className={`flex-1 rounded-2xl p-4 min-h-[200px] border shadow-inner backdrop-blur-sm ${colors.bg} ${colors.border}`}
                                    onDrop={(e) => handleDrop(e, group)}
                                    onDragOver={handleDragOver}
                                >
                                    <AnimatePresence>
                                        {groupedData[group].map(entry => (
                                            <TeamCard
                                                key={entry.id}
                                                entry={entry}
                                                onDragStart={handleDragStart}
                                                colorClass="bg-slate-900/90 border-white/10 hover:border-white/20"
                                            />
                                        ))}
                                    </AnimatePresence>
                                    {groupedData[group].length === 0 && (
                                        <div className="h-full flex items-center justify-center text-slate-600/50 text-sm py-10">
                                            チームをドロップ
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </LayoutGroup>
        </div>
    );
}

function TeamCard({ entry, onDragStart, colorClass }: { entry: TeamEntry, onDragStart: (e: React.DragEvent, id: string) => void, colorClass: string }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            draggable
            onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, entry.id)}
            className={`mb-3 p-4 rounded-xl border cursor-grab active:cursor-grabbing group relative overflow-hidden backdrop-blur-md shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${colorClass}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
                <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-sm sm:text-base truncate mb-1.5">{entry.teamName}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-400 bg-black/20 px-2 py-1 rounded w-fit border border-white/5">
                        <Users className="w-3 h-3 text-indigo-400" />
                        {entry.players.length}名
                    </div>
                </div>
                <GripVertical className="w-5 h-5 text-slate-600 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
            </div>
        </motion.div>
    );
}
