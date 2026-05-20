"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Search, Loader2, Users, ArrowLeft, CheckCircle2, MessageSquare, X, Smartphone, ListCollapse, Printer } from "lucide-react";
import { TeamEntry, User, Project } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function ManagementProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [settings, setSettings] = useState<{ participationFee: number, insuranceFee: number }>({ participationFee: 0, insuranceFee: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [teamSearchQuery, setTeamSearchQuery] = useState("");
    const [selectedEntry, setSelectedEntry] = useState<TeamEntry | null>(null);

    const loadData = async () => {
        try {
            const [dataRes, projectsRes, settingsRes] = await Promise.all([
                fetch('/api/admin/data'),
                fetch('/api/admin/projects'),
                fetch('/api/settings')
            ]);
            
            if (dataRes.ok) {
                const data = await dataRes.json();
                if (data.entries) setEntries(data.entries.filter((e: TeamEntry) => e.tournamentId === projectId));
                if (data.users) setUsers(data.users);
            }
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                if (projectsData.projects) {
                    const p = projectsData.projects.find((p: Project) => p.id === projectId);
                    if (p) setProject(p);
                }
            }
            if (settingsRes.ok) {
                const s = await settingsRes.json();
                setSettings({ participationFee: Number(s.participationFee || 0), insuranceFee: Number(s.insuranceFee || 0) });
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const getRepName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : "Unknown";
    };

    const getRepPhone = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.phone : "-";
    };

    const handleUpdateEntry = async (entryId: string, updates: Partial<TeamEntry>) => {
        setEntries(entries.map(e => e.id === entryId ? { ...e, ...updates } : e));
        if (selectedEntry && selectedEntry.id === entryId) {
            setSelectedEntry({ ...selectedEntry, ...updates });
        }
        try {
            await fetch('/api/management/entry/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId, updates })
            });
        } catch (e) {
            alert("更新に失敗しました。再読み込みします。");
            loadData();
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8 text-emerald-500 mb-4" /><span className="text-sm tracking-widest text-slate-400">データ読み込み中...</span></div>;
    }

    if (!project) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4 text-center">
            <div>
                <p className="text-xl mb-4 font-bold text-red-400">プロジェクトが見つかりません</p>
                <Button onClick={() => router.push('/management')} variant="outline" className="border-slate-700">一覧に戻る</Button>
            </div>
        </div>;
    }

    const filteredEntries = entries.filter(entry => {
        const q = teamSearchQuery.toLowerCase();
        return q === "" ||
            entry.teamName.toLowerCase().includes(q) ||
            getRepName(entry.userId).toLowerCase().includes(q) ||
            getRepPhone(entry.userId).includes(q);
    });

    const isWaitlisted = (entry: TeamEntry) => {
        if (!project.maxTeams) return false;
        if (entry.status === 'cancelled') return false;
        
        const sorted = [...entries.filter(e => e.status !== 'cancelled')].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const index = sorted.findIndex(e => e.id === entry.id);
        return index >= project.maxTeams;
    };

    const calculateLotteryNumbers = (entriesList: TeamEntry[]) => {
        const validEntries = entriesList.filter(e => e.status !== 'cancelled');
        const sorted = [...validEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const occupied = new Set<number>();
        const assigned = new Map<string, { requested: number | undefined, final: number | undefined, bumped: boolean }>();

        for (const entry of sorted) {
            let req = entry.preliminaryNumber;
            let finalNum: number | undefined = undefined;
            let bumped = false;

            if (req && !occupied.has(req)) {
                finalNum = req;
                occupied.add(req);
            } else if (req) {
                bumped = true;
                for (let i = 1; i <= 16; i++) {
                    if (!occupied.has(i)) {
                        finalNum = i;
                        occupied.add(i);
                        break;
                    }
                }
            }
            assigned.set(entry.id, { requested: req, final: finalNum, bumped });
        }
        return assigned;
    };

    const lotteryAssignments = calculateLotteryNumbers(entries);

    const confirmedEntries = filteredEntries.filter(e => !isWaitlisted(e) && e.status !== 'cancelled');
    const otherEntries = filteredEntries.filter(e => isWaitlisted(e) || e.status === 'cancelled');

    const renderEntryCard = (entry: TeamEntry) => {
        const insCount = entry.players ? entry.players.filter(p => p.insurance).length : 0;
        const playerCount = entry.players ? entry.players.length : 0;
        const participationTotal = settings.participationFee * playerCount;
        const insuranceTotal = insCount * settings.insuranceFee;
        const totalAmount = participationTotal + insuranceTotal;
        const wl = isWaitlisted(entry);
        const assignment = lotteryAssignments.get(entry.id);

        return (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <Card className={`overflow-hidden border-slate-700/50 ${wl ? 'bg-amber-950/40 border-amber-500/30' : 'bg-slate-900/60'} p-0`}>
                    <div className="p-4 sm:p-5 relative">
                        {/* Top row: Status/Waitlist & Prelim Number */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                {entry.status === 'cancelled' ? (
                                    <span className="text-[10px] font-bold tracking-wider bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700">キャンセル</span>
                                ) : wl ? (
                                    <span className="text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">C待ち</span>
                                ) : (
                                    <span className="text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">確定済</span>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">予選番号</span>
                                {assignment && assignment.final ? (
                                    assignment.bumped ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-xl font-black text-amber-400 leading-none px-2 py-0.5 bg-slate-800 rounded-md border border-amber-400/30 shadow-inner">
                                                {assignment.final}
                                            </span>
                                            <span className="text-[10px] text-slate-500 line-through mt-1">希望: {assignment.requested}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xl font-black text-white leading-none px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700 shadow-inner">
                                            {assignment.final}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-sm font-bold text-slate-600">-</span>
                                )}
                            </div>
                        </div>

                        {/* Team Name */}
                        <h3 className="text-xl font-black text-white mb-0.5 line-clamp-1">{entry.teamName}</h3>
                        <p className="text-xs font-medium text-slate-500 mb-4">{entry.teamNameKana || "フリガナなし"}</p>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-white/5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">代表者 / 連絡先</p>
                                <p className="text-sm font-bold text-slate-200 line-clamp-1">{getRepName(entry.userId)}</p>
                                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{getRepPhone(entry.userId)}</p>
                            </div>
                            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-white/5 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ご請求額</p>
                                    <p className="text-[10px] text-slate-500 font-bold">({entry.players?.length || 0}名)</p>
                                </div>
                                <p className="text-lg font-black text-emerald-400 leading-none">¥{totalAmount.toLocaleString()}</p>
                                <p className="text-[9px] text-slate-500 mt-1 whitespace-nowrap">参(x{playerCount}):¥{participationTotal.toLocaleString()} | 保(x{insCount}):¥{insuranceTotal.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Memo Snippet */}
                        {entry.managementMemo && (
                            <div className="mb-4 bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 relative hover:bg-amber-900/20 transition-colors cursor-pointer" onClick={() => setSelectedEntry(entry)}>
                                <div className="flex gap-2 items-center mb-1">
                                    <MessageSquare className="w-3 h-3 text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">運営メモ</span>
                                </div>
                                <p className="text-xs text-amber-100/80 leading-relaxed line-clamp-2">{entry.managementMemo}</p>
                            </div>
                        )}

                        {/* Action Toggles Area */}
                        <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-800 pt-4">
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={() => handleUpdateEntry(entry.id, { isOpenChatJoined: !entry.isOpenChatJoined })}
                                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${entry.isOpenChatJoined ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {entry.isOpenChatJoined ? <CheckCircle2 className="w-5 h-5 mb-1" /> : <div className="w-5 h-5 rounded-full border border-current mb-1 opacity-50" />}
                                    <span className="text-[10px] font-bold tracking-wider">オープンチャット</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        const alreadyPaid = entry.isPaid;
                                        if (alreadyPaid) {
                                            if (confirm(`「${entry.teamName}」の支払い状況を未払いに戻しますか？`)) {
                                                handleUpdateEntry(entry.id, { isPaid: false });
                                            }
                                        } else {
                                            const markPaid = confirm(`「${entry.teamName}」の支払いを確認しましたか？\n※「OK」で支払い済みに更新され、ユーザー側で領収書が発行可能になります。`);
                                            if (markPaid) {
                                                handleUpdateEntry(entry.id, { isPaid: true });
                                            }
                                        }
                                    }}
                                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${entry.isPaid ? 'bg-blue-900/30 border-blue-500/40 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {entry.isPaid ? <CheckCircle2 className="w-5 h-5 mb-1" /> : <div className="w-5 h-5 rounded-full border border-current mb-1 opacity-50" />}
                                    <span className="text-[10px] font-bold tracking-wider">参加費 支払済</span>
                                </button>
                            </div>
                            
                            <Button variant="outline" className="w-full sm:w-auto h-auto py-2 flex flex-col items-center justify-center border-slate-700 hover:bg-slate-800 rounded-xl" onClick={() => setSelectedEntry(entry)}>
                                <Smartphone className="w-5 h-5 mb-1 opacity-70" />
                                <span className="text-[10px] font-bold">詳細・全メモ</span>
                            </Button>
                            {entry.status === 'submitted' && (
                                <a href={`/team/invoice?id=${entry.id}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto h-auto py-2 flex flex-col items-center justify-center border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors">
                                    <Printer className="w-5 h-5 mb-1 opacity-70" />
                                    <span className="text-[10px] font-bold">請求書(PDF)</span>
                                </a>
                            )}
                            {/* ユーザー側の領収書発行状況 */}
                            {(entry as any).receiptIssuedAt ? (
                                <a href={`/management/receipt?id=${entry.id}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto h-auto py-2 flex flex-col items-center justify-center border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/40 rounded-xl text-emerald-400 transition-colors">
                                    <Printer className="w-5 h-5 mb-1 opacity-80" />
                                    <span className="text-[10px] font-bold">領収書(発行済)</span>
                                </a>
                            ) : (
                                <div className="w-full sm:w-auto h-auto py-2 flex flex-col items-center justify-center border border-slate-700 bg-slate-900/50 rounded-xl text-slate-500 cursor-not-allowed">
                                    <Printer className="w-5 h-5 mb-1 opacity-40" />
                                    <span className="text-[10px] font-bold">領収書(未発行)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2" onClick={() => router.push('/management')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1">{project.name}</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Search Bar - Sticky on mobile */}
                <div className="sticky top-[72px] z-40 bg-slate-950/90 backdrop-blur-sm py-2 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            type="text"
                            placeholder="名前・電話番号で検索..."
                            value={teamSearchQuery}
                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                            className="pl-11 bg-slate-900/80 border-slate-700 h-12 text-base focus-visible:ring-emerald-500 shadow-xl rounded-2xl"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-sm font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
                        <ListCollapse className="w-4 h-4" /> 確定エントリー一覧 ({confirmedEntries.length})
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-500/30"
                            size="sm"
                            onClick={() => window.open(`/management/print-accounting?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            受付リスト (A4)
                        </Button>
                        <Button
                            className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/30"
                            size="sm"
                            onClick={() => window.open(`/management/print-insurance?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            保険リスト (A4)
                        </Button>
                        <Button
                            className="bg-purple-900/40 hover:bg-purple-800/60 text-purple-400 border border-purple-500/30"
                            size="sm"
                            onClick={() => window.open(`/management/print-lottery?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            抽選券 (A4)
                        </Button>
                        <Button
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200"
                            size="sm"
                            onClick={() => window.open(`/management/print?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            一括印刷 (A4)
                        </Button>
                    </div>
                </div>

                {/* Main Team Cards List */}
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {confirmedEntries.map(renderEntryCard)}
                        {confirmedEntries.length === 0 && (
                            <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/5">
                                <p className="text-slate-500">条件に一致する確定チームがありません</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Waitlisted & Cancelled Teams */}
                {otherEntries.length > 0 && (
                    <div className="mt-12 mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <h2 className="text-sm font-black text-amber-500/80 tracking-widest flex items-center gap-2">
                                キャンセル待ち・辞退チーム ({otherEntries.length})
                            </h2>
                            <div className="h-px bg-slate-800 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 opacity-80">
                            <AnimatePresence>
                                {otherEntries.map(renderEntryCard)}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Team Details & Full Memo Modal */}
                <AnimatePresence>
                    {selectedEntry && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                                onClick={() => setSelectedEntry(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-slate-900 border-t sm:border border-slate-700/50 sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] pb-8 sm:pb-0 overflow-y-auto relative z-10 flex flex-col rounded-t-3xl"
                            >
                                <div className="p-1 flex justify-center sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full my-2" />
                                </div>
                                <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-slate-900/95 backdrop-blur z-20">
                                    <div className="pr-8">
                                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{selectedEntry.teamName}</h2>
                                        <p className="text-slate-400 text-xs sm:text-sm mt-1">{selectedEntry.teamNameKana || "フリガナなし"}</p>
                                    </div>
                                    <button onClick={() => setSelectedEntry(null)} className="absolute right-4 top-4 text-slate-400 bg-slate-800 p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-4 sm:p-6 space-y-6">
                                    <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">意気込み・紹介文</p>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{selectedEntry.teamIntroduction || "（未記入）"}</p>
                                    </div>

                                    {/* Editable Management Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-widest pl-1">
                                            <MessageSquare className="w-4 h-4" /> 運営用メモ設定
                                        </h3>

                                        <div className="mb-4">
                                            <label className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider block px-1">ユニフォーム色</label>
                                            <Input
                                                type="text"
                                                className="w-full bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-emerald-500"
                                                placeholder="例：赤、白、黒 など"
                                                value={selectedEntry.uniformColor || ""}
                                                onChange={(e) => setSelectedEntry({ ...selectedEntry, uniformColor: e.target.value })}
                                                onBlur={(e) => handleUpdateEntry(selectedEntry.id, { uniformColor: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider block px-1">運営用メモ</label>
                                            <textarea
                                                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none text-base sm:text-sm"
                                                placeholder="チームについての備考や引き継ぎ事項などを記入してください..."
                                                value={selectedEntry.managementMemo || ""}
                                                onChange={(e) => {
                                                    const newMemo = e.target.value;
                                                    setSelectedEntry({ ...selectedEntry, managementMemo: newMemo });
                                                }}
                                                onBlur={(e) => handleUpdateEntry(selectedEntry.id, { managementMemo: e.target.value })}
                                            />
                                            <p className="text-xs text-amber-500/80 mt-2 font-bold px-1">入力箇所から外をタップすると自動保存されます。</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button
                                                 className={`h-12 border transition-colors text-sm font-bold shadow-none ${selectedEntry.isOpenChatJoined ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                                 onClick={() => handleUpdateEntry(selectedEntry.id, { isOpenChatJoined: !selectedEntry.isOpenChatJoined })}
                                            >
                                                {selectedEntry.isOpenChatJoined ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : null}
                                                OPチャット{selectedEntry.isOpenChatJoined ? '参加済' : '未確認'}
                                            </Button>
                                            <Button
                                                className={`h-12 border transition-colors text-sm font-bold shadow-none ${selectedEntry.isPaid ? 'bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-900/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                                onClick={() => handleUpdateEntry(selectedEntry.id, { isPaid: !selectedEntry.isPaid })}
                                            >
                                                {selectedEntry.isPaid ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : null}
                                                参加費{selectedEntry.isPaid ? '支払済' : '未払い'}
                                            </Button>

                                            <div className="col-span-2 mt-4 space-y-3">
                                                <Button
                                                    className="w-full h-12 border bg-indigo-900/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 font-bold flex items-center justify-center"
                                                    onClick={() => window.open(`/management/print?teamId=${selectedEntry.id}`, '_blank')}
                                                >
                                                    <Printer className="w-5 h-5 mr-2" />
                                                    このチームの情報を印刷 (A4)
                                                </Button>
                                                <Button
                                                    className="w-full h-12 border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center"
                                                    onClick={() => {
                                                        if (!confirm("本当にこのチームを仮エントリー状態に戻しますか？\n（ユーザーが再度メンバー編集できるようになります）")) return;
                                                        handleUpdateEntry(selectedEntry.id, { status: 'draft' });
                                                    }}
                                                >
                                                    仮エントリーに戻す
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
