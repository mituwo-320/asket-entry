import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PrintChecklistItem } from '@/lib/types';
import { Printer, Plus, Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCcw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrintChecklistProps {
    projectId: string;
}

export default function PrintChecklist({ projectId }: PrintChecklistProps) {
    const [items, setItems] = useState<PrintChecklistItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadChecklist = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/checklist?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            } else {
                setError('印刷チェックリストの取得に失敗しました。');
            }
        } catch (e) {
            setError('通信エラーが発生しました。');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadChecklist();
        }
    }, [projectId]);

    const handleToggle = async (item: PrintChecklistItem) => {
        const targetStatus = !item.isPrinted;
        
        // Optimistic Update
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPrinted: targetStatus } : i));

        try {
            const res = await fetch('/api/admin/checklist', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, isPrinted: targetStatus })
            });

            if (!res.ok) {
                // Revert
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPrinted: !targetStatus } : i));
                alert('ステータスの更新に失敗しました。');
            }
        } catch (e) {
            // Revert
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPrinted: !targetStatus } : i));
            alert('通信エラーが発生しました。');
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        setIsAdding(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, name: newItemName.trim() })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setItems(prev => [...prev, data.item]);
                setNewItemName('');
            } else {
                alert(data.error || '項目の追加に失敗しました。');
            }
        } catch (e) {
            alert('通信エラーが発生しました。');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteItem = async (id: string, name: string) => {
        if (!confirm(`「${name}」をチェックリストから削除しますか？`)) return;

        try {
            const res = await fetch(`/api/admin/checklist?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id));
            } else {
                alert('項目の削除に失敗しました。');
            }
        } catch (e) {
            alert('通信エラーが発生しました。');
        }
    };

    // Calculations
    const totalCount = items.length;
    const printedCount = items.filter(i => i.isPrinted).length;
    const progressPercent = totalCount > 0 ? Math.round((printedCount / totalCount) * 100) : 0;
    const isAllCompleted = totalCount > 0 && printedCount === totalCount;

    return (
        <Card className="p-6 bg-slate-900/40 border-white/5 relative overflow-hidden backdrop-blur-md flex flex-col h-[520px]">
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-400" />
                    <span>印刷忘れ防止チェックリスト</span>
                </h3>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadChecklist} 
                    disabled={isLoading}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-full"
                >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Progress Section */}
            <div className="mb-4 relative z-10">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-400 tracking-wider">印刷進捗率</span>
                    <span className={`transition-colors duration-300 ${isAllCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                        {progressPercent}% ({printedCount}/{totalCount})
                    </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        className={`h-full rounded-full ${isAllCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>

                {/* All Completed Badge */}
                <AnimatePresence>
                    {isAllCompleted && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.05)]"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>✨ 大会前のすべての印刷準備が完了しました！</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Checklist items list */}
            <div className="flex-1 overflow-y-auto mb-4 pr-1 space-y-1.5 relative z-10 custom-scrollbar">
                {isLoading && items.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm gap-2">
                        <Loader2 className="animate-spin w-4 h-4 text-indigo-500" />
                        <span>チェックリストを読み込み中...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        項目がありません。
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {items.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                                    item.isPrinted 
                                        ? 'bg-slate-900/20 border-emerald-500/15 text-slate-400' 
                                        : 'bg-slate-950/40 border-white/5 hover:border-indigo-500/25 text-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <button
                                        onClick={() => handleToggle(item)}
                                        className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                                            item.isPrinted 
                                                ? 'bg-emerald-500 text-slate-950 scale-100' 
                                                : 'border border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5'
                                        }`}
                                    >
                                        {item.isPrinted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </button>
                                    <span 
                                        onClick={() => handleToggle(item)}
                                        className={`text-sm select-none cursor-pointer truncate ${
                                            item.isPrinted ? 'line-through text-slate-500' : 'font-medium'
                                        }`}
                                    >
                                        {item.name}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="text-slate-500 hover:text-red-400 p-1 hover:bg-white/5 rounded transition-colors ml-2 flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Form to add custom checklist item */}
            <form onSubmit={handleAddItem} className="mt-auto relative z-10 pt-3 border-t border-white/5 flex gap-2">
                <Input
                    type="text"
                    placeholder="新しい印刷物を追加..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    disabled={isAdding}
                    className="flex-1 bg-slate-950 border-slate-800 text-sm h-10 focus-visible:ring-indigo-500"
                />
                <Button 
                    type="submit"
                    disabled={isAdding || !newItemName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-4 flex items-center justify-center flex-shrink-0"
                >
                    {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <><Plus className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">追加</span></>
                    )}
                </Button>
            </form>
        </Card>
    );
}
