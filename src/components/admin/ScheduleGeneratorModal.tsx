"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { X, Play, Clock, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScheduleGeneratorModalProps {
    onClose: () => void;
    onGenerate: (config: any) => Promise<void>;
}

export default function ScheduleGeneratorModal({ onClose, onGenerate }: ScheduleGeneratorModalProps) {
    const [startTime, setStartTime] = useState("10:00");
    const [courts, setCourts] = useState(2);
    const [matchDuration, setMatchDuration] = useState(15);
    const [interval, setInterval] = useState(5);
    const [slotsPerCourt, setSlotsPerCourt] = useState(8);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await onGenerate({
                startTime,
                courts,
                matchDuration,
                interval,
                slotsPerCourt
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert("生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur z-20">
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Play className="w-5 h-5 text-indigo-400" />
                        スケジュール自動生成
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    <Clock className="w-3 h-3 inline mr-1 mb-0.5" />
                                    試合開始時刻
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    <LayoutGrid className="w-3 h-3 inline mr-1 mb-0.5" />
                                    コート数
                                </label>
                                <select
                                    value={courts}
                                    onChange={(e) => setCourts(Number(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                                >
                                    <option value={1}>1面 (Aコートのみ)</option>
                                    <option value={2}>2面 (A/Bコート)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    1試合の所要時間 (分)
                                </label>
                                <input
                                    type="number"
                                    min={5}
                                    value={matchDuration}
                                    onChange={(e) => setMatchDuration(Number(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    試合間隔 (分)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={interval}
                                    onChange={(e) => setInterval(Number(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                作成する試合枠数 (1コートあたり)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={slotsPerCourt}
                                onChange={(e) => setSlotsPerCourt(Number(e.target.value))}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
                        <p><strong>注意:</strong> 指定した時間設定に基づいて、チームが未割り当ての「空の試合枠」を一括で作成します。作成後、右側のパネルからチームをドラッグ＆ドロップして対戦カードを完成させてください。既存のスケジュールは上書きされます。</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-white/5 font-medium">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`px-6 py-2.5 bg-indigo-600/90 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 border border-indigo-500/50 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-500 active:scale-95'}`}
                        >
                            {isGenerating && <span className="animate-spin text-white">⏳</span>}
                            自動生成を実行
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
