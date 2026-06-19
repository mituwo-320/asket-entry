import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, RefreshCcw, Loader2, Calendar, HardDrive } from 'lucide-react';

interface BackupItem {
    fileName: string;
    tournamentId: string;
    createdAt: string;
    size: number;
}

interface BackupManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestoreSuccess: () => void;
    projects: Array<{ id: string, name: string }>;
}

export default function BackupManagerModal({ isOpen, onClose, onRestoreSuccess, projects }: BackupManagerModalProps) {
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [backupProjectId, setBackupProjectId] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/backups');
            if (res.ok) {
                const data = await res.json();
                setBackups(data.backups || []);
            }
        } catch (e) {
            console.error('Failed to load backups', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadBackups();
            setMessage(null);
            if (projects.length > 0 && !backupProjectId) {
                setBackupProjectId(projects[0].id);
            }
        }
    }, [isOpen, projects]);

    const handleCreateBackup = async () => {
        if (!backupProjectId) return;
        setIsCreating(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: backupProjectId })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: `プロジェクトのバックアップを作成しました: ${data.fileName}` });
                loadBackups();
            } else {
                setMessage({ type: 'error', text: data.error || 'バックアップ作成に失敗しました。' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: '通信エラーが発生しました。' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleRestore = async (backup: BackupItem) => {
        const project = projects.find(p => p.id === backup.tournamentId);
        const pName = project ? project.name : backup.tournamentId;

        if (!confirm(`警告: 「${pName}」の現在のチーム登録データがすべて削除され、バックアップ時点の状態に復元されます。\nよろしいですか？`)) {
            return;
        }

        setIsRestoring(backup.fileName);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/backups/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: backup.fileName })
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                onRestoreSuccess();
            } else {
                setMessage({ type: 'error', text: data.error || '復元に失敗しました。' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: '通信エラーが発生しました。' });
        } finally {
            setIsRestoring(null);
        }
    };

    if (!isOpen) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getProjectName = (tid: string) => {
        const project = projects.find(p => p.id === tid);
        return project ? project.name : `大会ID: ${tid}`;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl max-h-[85vh] flex flex-col"
                >
                    <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-indigo-400" />
                                    <span>自動バックアップからのデータ復元</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">シードデータの作成（流し込み）や削除の直前に自動保存された履歴から、データを以前の状態に復元できます。</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full hover:bg-white/5 w-8 h-8 p-0">
                                <X className="w-5 h-5 text-slate-400 hover:text-white" />
                            </Button>
                        </div>

                        {/* Message Banner */}
                        {message && (
                            <div className={`p-4 text-sm text-center font-bold ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/20' : 'bg-red-500/20 text-red-400 border-b border-red-500/20'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* 手動バックアップ作成エリア */}
                            <div className="bg-slate-950 p-4 border border-indigo-950/40 rounded-lg space-y-3">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5" />
                                    <span>手動バックアップの作成</span>
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select
                                        value={backupProjectId}
                                        onChange={(e) => setBackupProjectId(e.target.value)}
                                        className="flex-1 h-9 bg-slate-900 border border-slate-700 rounded-md text-sm px-3 text-slate-200"
                                    >
                                        <option value="" disabled>プロジェクトを選択...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={handleCreateBackup}
                                        disabled={isCreating || !backupProjectId}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs h-9 px-4 flex-shrink-0"
                                    >
                                        {isCreating ? (
                                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />作成中</>
                                        ) : (
                                            '現在のデータを保存'
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-500">選択した大会の現在の登録チーム・選手データ、および関連するユーザーアカウント情報をJSON形式で安全に保存します。</p>
                            </div>

                            <div className="flex justify-between items-center mb-2 pt-2 border-t border-white/5">
                                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">バックアップ履歴 ({backups.length}件)</span>
                                <Button variant="ghost" size="sm" onClick={loadBackups} disabled={isLoading} className="h-8 text-xs text-indigo-400 hover:text-indigo-300">
                                    <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                    再読み込み
                                </Button>
                            </div>

                            {isLoading && backups.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                                    <span>履歴を読み込み中...</span>
                                </div>
                            ) : backups.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                    <Database className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                                    <span>保存されたバックアップ履歴はありません。</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {backups.map((b) => (
                                        <div key={b.fileName} className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-white truncate">
                                                    {getProjectName(b.tournamentId)}
                                                </h4>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                        {new Date(b.createdAt).toLocaleString('ja-JP')}
                                                    </span>
                                                    <span className="text-slate-600">|</span>
                                                    <span>サイズ: {formatBytes(b.size)}</span>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => handleRestore(b)}
                                                disabled={!!isRestoring}
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs h-8 px-3 flex-shrink-0"
                                            >
                                                {isRestoring === b.fileName ? (
                                                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />復元中</>
                                                ) : (
                                                    'この時点に復元'
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
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
