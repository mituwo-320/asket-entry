import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Project } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Save, Trash2, CheckCircle } from 'lucide-react';

interface ProjectManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    onProjectsUpdate: (updatedProjects: Project[]) => void;
}

export default function ProjectManagerModal({ isOpen, onClose, projects, onProjectsUpdate }: ProjectManagerModalProps) {
    const [localProjects, setLocalProjects] = useState<Project[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setLocalProjects(projects);
    }, [projects]);

    const handleAddProject = () => {
        const newProj: Project = {
            id: '',
            name: '新規プロジェクト (大会日程)',
            isActive: true,
            createdAt: new Date().toISOString()
        };
        setLocalProjects([...localProjects, newProj]);
        setEditingId(''); // Empty ID implies new until saved
    };

    const handleSave = async (project: Project, index: number) => {
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            const data = await res.json();

            if (data.success) {
                const updatedList = [...localProjects];
                updatedList[index] = data.project; // Update with true ID
                setLocalProjects(updatedList);
                onProjectsUpdate(updatedList);
                setEditingId(null);
                setSaveMessage({ type: 'success', text: '保存しました。' });
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                setSaveMessage({ type: 'error', text: data.error || '保存に失敗しました。' });
            }
        } catch (e) {
            setSaveMessage({ type: 'error', text: '通信エラーが発生しました。' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-3xl max-h-[90vh] flex flex-col"
                >
                    <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                    <span>プロジェクト・大会日程の管理</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">複数の大会日程やフェーズを作成し、それぞれの募集期間を設定します。</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full hover:bg-white/5 w-8 h-8 p-0">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Message Banner */}
                        {saveMessage && (
                            <div className={`p-3 text-sm text-center font-medium ${saveMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/20' : 'bg-red-500/20 text-red-400 border-b border-red-500/20'}`}>
                                {saveMessage.text}
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="flex justify-end mb-4">
                                <Button onClick={handleAddProject} className="bg-indigo-600 hover:bg-indigo-500 text-sm h-9 px-4">
                                    <Plus className="w-4 h-4 mr-1" />
                                    新規作成
                                </Button>
                            </div>

                            {localProjects.length === 0 ? (
                                <div className="text-center p-8 text-slate-500">プロジェクトがありません。</div>
                            ) : (
                                localProjects.map((p, index) => {
                                    const isEditing = editingId === p.id || (p.id === '' && editingId === '');

                                    return (
                                        <div key={p.id || index} className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-4">
                                            {isEditing ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest">プロジェクト名</label>
                                                        <Input
                                                            value={p.name}
                                                            onChange={(e) => {
                                                                const updated = [...localProjects];
                                                                updated[index].name = e.target.value;
                                                                setLocalProjects(updated);
                                                            }}
                                                            className="h-9 bg-slate-900 border-slate-700"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest">ステータス</label>
                                                        <select
                                                            value={p.isActive ? 'true' : 'false'}
                                                            onChange={(e) => {
                                                                const updated = [...localProjects];
                                                                updated[index].isActive = e.target.value === 'true';
                                                                setLocalProjects(updated);
                                                            }}
                                                            className="w-full h-9 bg-slate-900 border border-slate-700 rounded-md text-sm px-3 text-slate-200"
                                                        >
                                                            <option value="true">有効 (表示)</option>
                                                            <option value="false">無効 (非表示)</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest">募集開始日時</label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={p.entryStartDate ? new Date(new Date(p.entryStartDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                            onChange={(e) => {
                                                                const updated = [...localProjects];
                                                                updated[index].entryStartDate = e.target.value; // Server expects ISO String or parses it
                                                                setLocalProjects(updated);
                                                            }}
                                                            className="h-9 bg-slate-900 border-slate-700"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest">募集終了日時</label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={p.entryEndDate ? new Date(new Date(p.entryEndDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                            onChange={(e) => {
                                                                const updated = [...localProjects];
                                                                updated[index].entryEndDate = e.target.value;
                                                                setLocalProjects(updated);
                                                            }}
                                                            className="h-9 bg-slate-900 border-slate-700"
                                                        />
                                                    </div>

                                                    <div className="col-span-full flex justify-end gap-2 mt-2">
                                                        {p.id !== '' && (
                                                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>キャンセル</Button>
                                                        )}
                                                        <Button size="sm" onClick={() => handleSave(p, index)} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500">
                                                            <Save className="w-4 h-4 mr-1" />
                                                            保存
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-white font-medium flex items-center gap-2">
                                                            {p.name}
                                                            {p.isActive ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">有効</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">無効</span>
                                                            )}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 flex flex-col sm:flex-row sm:gap-4 mt-1">
                                                            <span>開始: {p.entryStartDate ? new Date(p.entryStartDate).toLocaleString('ja-JP') : '未設定'}</span>
                                                            <span className="hidden sm:inline">|</span>
                                                            <span>終了: {p.entryEndDate ? new Date(p.entryEndDate).toLocaleString('ja-JP') : '未設定'}</span>
                                                        </p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)} className="h-8">
                                                        <Save className="w-4 h-4 mr-1" />
                                                        編集
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end">
                            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white">
                                閉じる
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
