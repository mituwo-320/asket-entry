"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Search, Users, CheckCircle2, MessageSquare, X, Smartphone, ListCollapse, Printer, Trophy, Trash2 } from "lucide-react";
import { TeamEntry, User, Project } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { OperationsHeader, OperationsHeading, OperationsOverview, OperationsState } from "@/components/operations/OperationsFrame";
import PrintChecklist from "@/components/admin/PrintChecklist"; // NEW

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
    const [isChecklistOpen, setIsChecklistOpen] = useState(false); // NEW: Checklist Collapsible state

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
        return <OperationsState title="大会の受付情報を読み込んでいます" loading />;
    }

    if (!project) {
        return <OperationsState title="大会情報を確認できませんでした" message="大会一覧に戻り、対象の大会を選び直してください。" />;
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

    const clinicParticipatingTeams = entries.filter(e => e.status !== 'cancelled' && (e as any).clinicParticipation);
    const totalClinicCount = clinicParticipatingTeams.reduce((sum, e) => sum + ((e as any).clinicCount || 0), 0);

    const deskEntries = entries.filter(entry => entry.status !== "cancelled" && !isWaitlisted(entry));

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
                <Card className={`operations-entry-card overflow-hidden border-slate-700/50 ${wl ? 'bg-amber-950/40 border-amber-500/30' : 'bg-slate-900/60'} p-0`}>
                    <div className="p-4 sm:p-5 relative">
                        {/* Top row: Status/Waitlist & Prelim Number */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                {entry.status === 'cancelled' ? (
                                    <span className="text-[10px] font-bold tracking-wider bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700">キャンセル</span>
                                ) : wl ? (
                                    <span className="text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">キャンセル待ち</span>
                                ) : (
                                    <span className="text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">参加枠内</span>
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

                        {project?.hasClinic && (
                            <div className="mb-4">
                                {entry.clinicParticipation === null ? (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400">
                                        <span className="text-[10px] font-extrabold tracking-wider flex items-center gap-1">
                                            🏀 クリニック希望：未回答
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold animate-pulse">要催促</span>
                                    </div>
                                ) : entry.clinicParticipation === true ? (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-indigo-300">
                                        <span className="text-[10px] font-extrabold tracking-wider">
                                            🏀 クリニック希望：参加する
                                        </span>
                                        <span className="text-xs font-black text-indigo-400">{(entry as any).clinicCount}名</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-700 bg-slate-950/50 text-slate-400">
                                        <span className="text-[10px] font-bold tracking-wider">
                                            🏀 クリニック希望：不参加
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

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
                                    aria-pressed={!!entry.isOpenChatJoined}
                                    aria-label={`${entry.teamName}のLINE参加確認`}
                                    onClick={() => handleUpdateEntry(entry.id, { isOpenChatJoined: !entry.isOpenChatJoined })}
                                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${entry.isOpenChatJoined ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {entry.isOpenChatJoined ? <CheckCircle2 className="w-5 h-5 mb-1" /> : <div className="w-5 h-5 rounded-full border border-current mb-1 opacity-50" />}
                                    <span className="text-[10px] font-bold tracking-wider">{entry.isOpenChatJoined ? "LINE 確認済" : "LINE 未確認"}</span>
                                </button>
                                
                                <button
                                    aria-pressed={!!entry.isPaid}
                                    aria-label={`${entry.teamName}の入金確認`}
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
                                    <span className="text-[10px] font-bold tracking-wider">{entry.isPaid ? "入金確認済" : "入金未確認"}</span>
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
        <div className="operations-workspace operations-project-detail">
            {/* Header */}
            <OperationsHeader title="大会の受付・進行"><Button size="sm" onClick={() => router.push(`/management/${projectId}/bracket`)}><Trophy size={17} className="mr-2" aria-hidden="true" />トーナメント表</Button></OperationsHeader>

            <main id="operations-main" tabIndex={-1} className="operations-main">
                <OperationsHeading eyebrow="TOURNAMENT / CONTROL DESK" title={project.name} description="受付と連絡状況を確認し、チームごとの対応を進めます。" />
                <OperationsOverview items={[
                    { label: "参加枠内", value: deskEntries.length, note: "キャンセル待ち・辞退を除く" },
                    { label: "メンバー未確定", value: deskEntries.filter(e => e.status === "draft").length, note: "登録内容の確定前", attention: true },
                    { label: "未入金", value: deskEntries.filter(e => !e.isPaid).length, note: "支払い確認が必要", attention: true },
                    { label: "LINE未確認", value: deskEntries.filter(e => !e.isOpenChatJoined).length, note: "運営による確認前", attention: true },
                ]} />
                {project?.hasClinic && (
                    <div className="mb-8 space-y-4">
                        <Card className="p-5 bg-indigo-950/20 border-indigo-500/30 text-indigo-200 shadow-xl rounded-2xl">
                            <h3 className="font-extrabold text-white text-base mb-3 flex items-center gap-2">
                                {project.clinicTitle || '🏀 バスケクリニック参加希望状況'}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-indigo-500/10">
                                    <p className="text-xs text-slate-400 font-medium">希望チーム数</p>
                                    <p className="text-2xl font-black text-indigo-400 mt-1">{clinicParticipatingTeams.length} <span className="text-xs font-normal text-slate-500">チーム</span></p>
                                </div>
                                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-indigo-500/10">
                                    <p className="text-xs text-slate-400 font-medium">参加希望者 総数</p>
                                    <p className="text-2xl font-black text-emerald-400 mt-1">{totalClinicCount} <span className="text-xs font-normal text-slate-500">名</span></p>
                                </div>
                            </div>
                        </Card>

                        {clinicParticipatingTeams.length > 0 && (
                            <Card className="p-0 overflow-hidden border-slate-800 bg-slate-900/40">
                                <div className="p-4 border-b border-white/5 bg-slate-900/60">
                                    <h4 className="text-sm font-bold text-white font-sans">バスケクリニック 参加希望チーム一覧</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-400">
                                        <thead className="bg-slate-950 text-slate-300 uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-2.5">チーム名</th>
                                                <th className="px-4 py-2.5">代表者</th>
                                                <th className="px-4 py-2.5 text-right">希望人数</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {clinicParticipatingTeams.map((e) => (
                                                <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-2.5 font-bold text-white">{e.teamName}</td>
                                                    <td className="px-4 py-2.5">{getRepName(e.userId)}</td>
                                                    <td className="px-4 py-2.5 text-right font-black text-emerald-400 text-sm">{(e as any).clinicCount || 0}名</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* Search Bar - Sticky on mobile */}
                <div className="operations-search">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            aria-label="チーム名・代表者・電話番号で検索"
                            type="search"
                            placeholder="チーム名・代表者・電話番号で検索"
                            value={teamSearchQuery}
                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                            className="pl-11 bg-slate-900/80 border-slate-700 h-12 text-base focus-visible:ring-emerald-500 shadow-xl rounded-2xl"
                        />
                    </div>
                </div>

                {/* Print Checklist Section */}
                <div className="mb-6 relative z-30">
                    <button
                        aria-expanded={isChecklistOpen}
                        onClick={() => setIsChecklistOpen(!isChecklistOpen)}
                        className="w-full flex items-center justify-between p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl hover:bg-slate-900/80 transition-colors shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <Printer className="w-5 h-5 text-indigo-400" />
                            <span className="text-sm font-bold text-white tracking-wide">印刷確認チェックリスト</span>
                        </div>
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full font-bold border border-indigo-500/20">
                            {isChecklistOpen ? "閉じる" : "表示する"}
                        </span>
                    </button>

                    <AnimatePresence>
                        {isChecklistOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-3"
                            >
                                <PrintChecklist projectId={projectId} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="operations-print-actions flex flex-col md:flex-row md:items-center justify-between mb-4 px-1 gap-4">
                    <h2 className="text-sm font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
                        <ListCollapse className="w-4 h-4" /> 参加枠内のチーム ({confirmedEntries.length})
                    </h2>
                    <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-end gap-2 w-full md:w-auto">
                        <Button
                            className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-500/30"
                            size="sm"
                            onClick={() => window.open(`/management/print-accounting?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            受付リスト (A4)
                        </Button>
                        <Button
                            className="bg-orange-900/40 hover:bg-orange-800/60 text-orange-400 border border-orange-500/30"
                            size="sm"
                            onClick={() => window.open(`/management/print-accounting-summary?projectId=${projectId}`, '_blank')}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            会計リスト (A4)
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
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 col-span-2 md:col-span-1"
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
                                <p className="text-slate-500">条件に一致する参加枠内のチームがありません</p>
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
                                role="dialog" aria-modal="true" aria-labelledby="operations-team-title"
                                className="operations-team-sheet bg-slate-900 border-t sm:border border-slate-700/50 sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] pb-8 sm:pb-0 overflow-y-auto relative z-10 flex flex-col rounded-t-3xl"
                            >
                                <div className="p-1 flex justify-center sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full my-2" />
                                </div>
                                <div className="operations-team-sheet-header p-4 sm:p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-slate-900/95 backdrop-blur z-20">
                                    <div className="pr-8">
                                        <p className="operations-sheet-kicker">TEAM FILE / チーム受付票</p>
                                        <h2 id="operations-team-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{selectedEntry.teamName}</h2>
                                        <p className="text-slate-400 text-xs sm:text-sm mt-1">{selectedEntry.teamNameKana || "フリガナなし"}</p>
                                    </div>
                                    <button aria-label="チーム詳細を閉じる" onClick={() => setSelectedEntry(null)} className="absolute right-4 top-4 text-slate-400 bg-slate-800 p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="operations-team-sheet-body p-4 sm:p-6 space-y-6">
                                    <div className="operations-sheet-introduction bg-slate-950/50 p-4 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">意気込み・紹介文</p>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{selectedEntry.teamIntroduction || "（未記入）"}</p>
                                    </div>

                                    {project?.hasClinic && (
                                        <div className="operations-sheet-clinic bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20">
                                            <p className="text-indigo-400 text-xs font-bold mb-2 uppercase tracking-wider">{project.clinicTitle || '🏀 バスケクリニック参加希望状況'}</p>
                                            <p className="text-slate-200 text-sm font-bold">
                                                {(selectedEntry as any).clinicParticipation
                                                    ? `✅ 参加する (${(selectedEntry as any).clinicCount}名)`
                                                    : "▫️ 参加しない"}
                                            </p>
                                        </div>
                                    )}

                                    {/* Editable Management Section */}
                                    <div className="operations-sheet-memo space-y-4">
                                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-widest pl-1">
                                            <MessageSquare className="w-4 h-4" /> 運営用メモ設定
                                        </h3>

                                        <div className="mb-4">
                                            <label htmlFor="operations-uniform" className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider block px-1">ユニフォーム色</label>
                                            <Input
                                                id="operations-uniform"
                                                type="text"
                                                className="w-full bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-emerald-500"
                                                placeholder="例：赤、白、黒 など"
                                                value={selectedEntry.uniformColor || ""}
                                                onChange={(e) => setSelectedEntry({ ...selectedEntry, uniformColor: e.target.value })}
                                                onBlur={(e) => handleUpdateEntry(selectedEntry.id, { uniformColor: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="operations-memo" className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider block px-1">運営用メモ</label>
                                            <textarea
                                                id="operations-memo"
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
                                        
                                        <div className="operations-sheet-actions grid grid-cols-2 gap-3 pt-2">
                                            <p className="operations-sheet-action-heading col-span-2">受付確認</p>
                                            <Button
                                                 aria-pressed={!!selectedEntry.isOpenChatJoined}
                                                 className={`h-12 border transition-colors text-sm font-bold shadow-none ${selectedEntry.isOpenChatJoined ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                                 onClick={() => handleUpdateEntry(selectedEntry.id, { isOpenChatJoined: !selectedEntry.isOpenChatJoined })}
                                            >
                                                {selectedEntry.isOpenChatJoined ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : null}
                                                OPチャット{selectedEntry.isOpenChatJoined ? '参加済' : '未確認'}
                                            </Button>
                                            <Button
                                                aria-pressed={!!selectedEntry.isPaid}
                                                className={`h-12 border transition-colors text-sm font-bold shadow-none ${selectedEntry.isPaid ? 'bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-900/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                                onClick={() => handleUpdateEntry(selectedEntry.id, { isPaid: !selectedEntry.isPaid })}
                                            >
                                                {selectedEntry.isPaid ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : null}
                                                参加費{selectedEntry.isPaid ? '支払済' : '未払い'}
                                            </Button>

                                            <div className="operations-sheet-tools col-span-2 mt-4 space-y-3">
                                                <Button
                                                    className="operations-sheet-print w-full h-12 border bg-indigo-900/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 font-bold flex items-center justify-center"
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
                                                <Button
                                                    className="operations-sheet-delete w-full h-12 border bg-red-950/40 border-red-900/30 text-red-400 hover:bg-red-900/30 font-bold flex items-center justify-center gap-2"
                                                    onClick={async () => {
                                                        if (!confirm("⚠️ 【警告】このチームのエントリーデータを完全に削除しますか？\nこの操作は取り消せません。選手データもすべて物理削除され、募集枠が解放されます。")) return;
                                                        try {
                                                            const res = await fetch('/api/admin/entry/delete', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ entryId: selectedEntry.id })
                                                            });
                                                            if (res.ok) {
                                                                setEntries((prev) => prev.filter(e => e.id !== selectedEntry.id));
                                                                setSelectedEntry(null);
                                                                alert("チームデータを完全に削除し、募集枠を解放しました。");
                                                            } else {
                                                                alert("削除に失敗しました");
                                                            }
                                                        } catch (e) {
                                                            alert("エラーが発生しました");
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    このチームを完全に削除する
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
