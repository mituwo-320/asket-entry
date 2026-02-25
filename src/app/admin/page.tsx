"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Search, Download, ShieldAlert, CheckCircle2, X, AlertCircle, Loader2, Users, Calendar, Trophy, Settings, FileDown, Ticket, Edit2, Printer } from "lucide-react";
import TimeScheduleEditor from '@/components/admin/TimeScheduleEditor';
import MatchResultModal from '@/components/admin/MatchResultModal';
import LotteryModal from '@/components/admin/LotteryModal';
import GroupManager from '@/components/admin/GroupManager';
import ProjectManagerModal from '@/components/admin/ProjectManagerModal'; // NEW
import Link from "next/link";
import * as XLSX from 'xlsx';
import { TeamEntry, User, Match, Project } from "@/lib/types";
import { getTournamentName } from "@/lib/tournament-constants";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
    // State
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]); // NEW: Projects State
    const [selectedProjectId, setSelectedProjectId] = useState<string>("2024-Spring"); // NEW: Project filter
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<{ playerName: string, teamName: string, insurance: boolean } | null>(null);
    const [teamSearchQuery, setTeamSearchQuery] = useState("");
    const [teamFilterStatus, setTeamFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [selectedEntry, setSelectedEntry] = useState<TeamEntry | null>(null); // For Details Modal
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null); // NEW: For Match Result Modal
    const [matches, setMatches] = useState<Match[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLotteryOpen, setIsLotteryOpen] = useState(false);
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false); // NEW

    // NEW: Settings State
    const [settings, setSettings] = useState<{ participationFee: number | string, insuranceFee: number | string, lineOpenChatLink?: string, entryDeadline?: string }>({ participationFee: 15000, insuranceFee: 800, lineOpenChatLink: "", entryDeadline: "" });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Helper
    const getTeamName = (teamId: string) => {
        if (teamId === 'Bye') return '不戦勝';
        const team = entries.find(e => e.id === teamId);
        return team ? team.teamName : '不明なチーム';
    };

    // Fetch Data
    const loadData = async () => {
        try {
            // Fetch basic data
            const res = await fetch('/api/admin/data');
            const data = await res.json();
            if (data.entries) setEntries(data.entries);
            if (data.users) setUsers(data.users);

            // Fetch matches
            const matchRes = await fetch('/api/matches');
            const matchData = await matchRes.json();
            if (matchData.matches) setMatches(matchData.matches);

            // Fetch Projects (Dates)
            const projectsRes = await fetch('/api/admin/projects');
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                if (projectsData.projects) {
                    setProjects(projectsData.projects);
                    if (projectsData.projects.length > 0) {
                        setSelectedProjectId(projectsData.projects[0].id);
                    }
                }
            }

            // Fetch Settings
            const settingsRes = await fetch('/api/settings');
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                if (settingsData && settingsData.participationFee !== undefined) setSettings(settingsData);
            }

        } catch (e) {
            console.error("Failed to fetch admin data", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // middleware.ts handles admin route protection, no need for localStorage checks here.
        loadData();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    const generateSchedule = async () => {
        if (!confirm("現在のエントリー状況で対戦カードを生成しますか？（既存のスケジュールは上書きされる可能性があります）")) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/schedule/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: '2024-Spring' }) // Should ideally imply this or fetch constant
            });
            const data = await res.json();
            if (data.success) {
                setMatches(data.matches);
                alert("対戦カードを生成しました");
            } else {
                alert(data.error || "生成に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const updateScore = (match: Match, field: 'scoreA' | 'scoreB', value: string) => {
        const numVal = value === '' ? undefined : parseInt(value);
        const updatedMatches = matches.map(m => {
            if (m.id === match.id) {
                return { ...m, [field]: numVal, status: 'playing' as const };
            }
            return m;
        });
        setMatches(updatedMatches);

        // Debounce save or save immediately? Let's save on blur or use a button.
        // For simple UX, let's just update local state and use the 'Finalize' button to really 'commit' status.
        // But we should probably save values too.
        // Let's implement auto-save or individual save.
        // Actually, let's trigger a background save.
        const updatedMatch = updatedMatches.find(m => m.id === match.id);
        if (updatedMatch) {
            fetch('/api/admin/match/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ match: updatedMatch })
            }).catch(e => console.error(e));
        }
    };

    const finalizeMatch = async (match: Match) => {
        if (!confirm("試合を終了し、結果を確定しますか？")) return;
        const updatedMatch = { ...match, status: 'finished' as const };
        // Determine winner logic if needed, but for now just status

        try {
            const res = await fetch('/api/admin/match/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ match: updatedMatch })
            });
            if (res.ok) {
                setMatches(matches.map(m => m.id === match.id ? updatedMatch : m));
            }
        } catch (e) {
            alert("保存に失敗しました");
        }
    };

    // Current View Filter logic for matches, entries
    const activeEntries = entries.filter(e => e.tournamentId === selectedProjectId);
    const activeMatches = matches.filter(m => m.tournamentId === selectedProjectId);

    // Stats Calculation using ONLY activeEntries
    const totalEntries = activeEntries.length;
    const totalPlayers = activeEntries.reduce((acc, entry) => acc + (entry.players ? entry.players.length : 0), 0);
    const insuranceNeeded = activeEntries.reduce((acc, entry) => acc + (entry.players ? entry.players.filter(p => p.insurance).length : 0), 0);

    // Settings & Project State Logic
    const expectedRevenue = totalEntries * Number(settings.participationFee || 0) + insuranceNeeded * Number(settings.insuranceFee || 0);

    const activeProjectData = projects.find(p => p.id === selectedProjectId);
    const now = new Date();
    let daysRemaining = -1;
    let isAccepting = false;

    if (activeProjectData?.entryEndDate) {
        const endDate = new Date(activeProjectData.entryEndDate);
        const startDate = activeProjectData.entryStartDate ? new Date(activeProjectData.entryStartDate) : new Date(0);
        const diffTime = endDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        isAccepting = activeProjectData.isActive && now >= startDate && now <= endDate;
    }

    // Helper to download Insurance List (Client-side)
    const downloadInsuranceList = () => {
        // 1. Flatten Data
        const rows: any[] = [];
        activeEntries.forEach(entry => {
            // Find User for Rep Name
            const user = users.find(u => u.id === entry.userId);
            const repName = user ? user.name : "Unknown";

            if (entry.players) {
                entry.players.forEach(player => {
                    if (player.insurance) {
                        rows.push({
                            "チーム名": entry.teamName,
                            "代表者": repName,
                            "選手名": player.name,
                            "フリガナ": player.furigana,
                            "保険": "加入必要"
                        });
                    }
                });
            }
        });

        // 2. Generate WorkSheet
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "保険加入者リスト");

        // 3. Download
        XLSX.writeFile(wb, "保険加入者リスト.xlsx");
    };

    // Helper to download Detailed Team List
    const downloadDetailedTeamList = () => {
        const rows: any[] = [];
        activeEntries.forEach(entry => {
            const user = users.find(u => u.id === entry.userId);
            const repName = user ? user.name : "Unknown";
            const repPhone = user ? user.phone : "-";
            const repEmail = user ? user.email : "-";
            const teamTotalFee = Number(settings.participationFee || 0) + (entry.players ? entry.players.filter(p => p.insurance).length * Number(settings.insuranceFee || 0) : 0);

            if (entry.players && entry.players.length > 0) {
                entry.players.forEach(player => {
                    rows.push({
                        "チーム名": entry.teamName,
                        "フリガナ(チーム)": entry.teamNameKana || "",
                        "参加状態": entry.status === 'submitted' ? '確定済' : '下書き',
                        "代表者": repName,
                        "電話番号": repPhone,
                        "メールアドレス": repEmail,
                        "支払状況": entry.isPaid ? '支払い済' : '未払い',
                        "合計請求額(円)": player.isRepresentative ? teamTotalFee : "-", // Only show fee once per team on rep's row for clarity or calculate per team
                        "選手名": player.name,
                        "フリガナ(選手)": player.furigana,
                        "代表フラグ": player.isRepresentative ? "〇" : "",
                        "リストバンド色": player.wristbandColor || "未定",
                        "保険加入": player.insurance ? "〇" : "×"
                    });
                });
            } else {
                // Teams with no players yet
                rows.push({
                    "チーム名": entry.teamName,
                    "代表者": repName,
                    "電話番号": repPhone,
                    "選手名": "(選手未登録)",
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "詳細チームプレイヤの一覧");
        XLSX.writeFile(wb, "詳細チームプレイヤの一覧.xlsx");
    };

    // Save Settings Handler
    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        setSaveMessage(null);

        // Normalize empty string to undefined for date
        let updatedDeadline: string | undefined = settings.entryDeadline;
        if (!updatedDeadline || updatedDeadline.trim() === '') {
            updatedDeadline = undefined;
        } else {
            // ensure valid date, datetime-local usually returns YYYY-MM-DDThh:mm
            updatedDeadline = new Date(updatedDeadline).toISOString();
        }

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participationFee: Number(settings.participationFee) || 0,
                    insuranceFee: Number(settings.insuranceFee) || 0,
                    lineOpenChatLink: settings.lineOpenChatLink || undefined,
                    entryDeadline: updatedDeadline
                })
            });
            if (res.ok) {
                setSaveMessage({ type: 'success', text: '設定を保存しました！チーム一覧に即時反映されます。' });
                // We could call loadData() but total fee is derived locally effectively if we update state here or trust the current settings state
                setTimeout(() => setSaveMessage(null), 5000);
            } else {
                setSaveMessage({ type: 'error', text: '設定の保存に失敗しました' });
            }
        } catch (e) {
            setSaveMessage({ type: 'error', text: '通信エラーが発生しました' });
        } finally {
            setIsSavingSettings(false);
        }
    };

    // 2. Search Handler
    const handleSearch = () => {
        let found = null;
        for (const entry of entries) {
            if (!entry.players) continue;
            const player = entry.players.find(p => p.name.includes(searchQuery) || p.furigana.includes(searchQuery));
            if (player) {
                found = { playerName: player.name, teamName: entry.teamName, insurance: player.insurance };
                break;
            }
        }
        setSearchResult(found);
    };

    // Helper to get Rep Name
    const getRepName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : "Unknown";
    };

    // Helper to get Rep Phone
    const getRepPhone = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.phone : "-";
    };

    // Filter Entries for Team List View
    const filteredEntries = activeEntries.filter(entry => {
        // 1. Search (Team Name or Rep Name or Phone)
        const q = teamSearchQuery.toLowerCase();
        const repName = getRepName(entry.userId).toLowerCase();
        const phone = getRepPhone(entry.userId);
        const matchesSearch = q === "" ||
            entry.teamName.toLowerCase().includes(q) ||
            repName.includes(q) ||
            phone.includes(q);

        // 2. Filter Paid
        const matchesFilter =
            teamFilterStatus === 'all' ||
            (teamFilterStatus === 'paid' && entry.isPaid) ||
            (teamFilterStatus === 'unpaid' && !entry.isPaid);

        return matchesSearch && matchesFilter;
    });

    const calculateLotteryNumbers = (entriesList: TeamEntry[]) => {
        const sorted = [...entriesList].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

    const lotteryAssignments = calculateLotteryNumbers(activeEntries);

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8 mr-3 text-indigo-500" /> <span className="text-lg">Loading Admin Data...</span></div>;
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight hidden sm:block">BasketEntry Admin</h1>
                    </div>
                    {/* Project Selector section in header */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
                            <span className="text-xs text-slate-400 pl-2">対象日程:</span>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="bg-slate-950/50 border-none text-slate-200 text-sm rounded focus:ring-1 focus:ring-indigo-500 outline-none h-8 px-2"
                            >
                                <option value="" disabled>---</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.isActive ? '' : '(無効)'}</option>
                                ))}
                            </select>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20"
                            onClick={() => setIsProjectManagerOpen(true)}
                        >
                            <Calendar className="w-4 h-4 mr-1.5" />
                            日程・プロジェクト管理
                        </Button>
                        <span className="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hidden lg:inline-block tracking-wide">
                            v1.0.0 (Beta)
                        </span>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white flex items-center gap-1 sm:gap-2" onClick={async () => {
                            await fetch('/api/admin/auth/logout', { method: 'POST' });
                            window.location.href = '/';
                        }}>
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline text-xs sm:text-sm font-medium">トップへ戻る</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-[95%]">
                {/* Mobile Project Selector */}
                <div className="md:hidden mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest pl-1">対象日程</label>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none h-12 px-3 transition-colors"
                    >
                        <option value="" disabled>プロジェクトを選択...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name} {p.isActive ? '' : '(無効)'}</option>
                        ))}
                    </select>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-8"
                >
                    {/* Welcome Section */}
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">ダッシュボード</h2>
                            <p className="text-slate-400 text-sm">大会の運営状況を一元管理し、全体の進行をサポートします。</p>
                        </div>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 flex items-center"
                            onClick={() => setIsSettingsModalOpen(true)}
                        >
                            <Settings className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">設定</span>
                        </Button>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <Card className="p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="w-16 h-16 text-white" />
                            </div>
                            <Trophy className="w-8 h-8 text-indigo-400 mb-3" />
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">Total Teams</p>
                            <h3 className="text-4xl font-black text-white">{totalEntries}<span className="text-xl text-slate-500 ml-1 font-medium">チーム</span></h3>
                        </Card>
                        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border-indigo-500/30 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="text-indigo-300 text-sm font-bold tracking-wider mb-2 relative z-10">登録選手総数</div>
                            <div className="text-4xl font-black text-white relative z-10">{totalPlayers}</div>
                            <div className="text-xs text-indigo-400/80 mt-2 font-medium relative z-10">1チーム平均 {(totalPlayers / Math.max(1, totalEntries)).toFixed(1)}人</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-pink-900/40 to-slate-900/40 border-pink-500/30 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="text-pink-300 text-sm font-bold tracking-wider mb-2 relative z-10">保険対象者 (¥{Number(settings.insuranceFee || 0)})</div>
                            <div className="text-4xl font-black text-white relative z-10">{insuranceNeeded}</div>
                            <div className="text-xs text-pink-400/80 mt-2 font-medium relative z-10">
                                見積: ¥{(insuranceNeeded * Number(settings.insuranceFee || 0)).toLocaleString()}
                            </div>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border-emerald-500/30 p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/5 pulse-slow" />
                            <div className="text-emerald-300 text-sm font-bold tracking-wider mb-2 relative z-10">ステータス</div>
                            <div className={`text-2xl sm:text-3xl font-black relative z-10 ${isAccepting ? 'text-white' : 'text-slate-400'}`}>
                                {isAccepting ? '受付中' : '受付期間外'}
                            </div>
                            <div className="text-xs text-emerald-400/80 mt-2 font-medium relative z-10">
                                {isAccepting ? `残り ${daysRemaining}日` : '---'}
                            </div>
                        </Card>
                    </motion.div>


                    {/* NEW: Team Management Section */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/20">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-400" />
                                    チーム一覧
                                </h2>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="text-sm text-slate-400 font-medium hidden sm:block">{totalEntries} チーム</div>
                                    <Button className="w-full sm:w-auto hover:bg-indigo-600 hover:text-white" size="sm" variant="outline" onClick={downloadDetailedTeamList}>
                                        <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">リスト出力 (詳細)</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Search and Filter Controls */}
                            <div className="px-6 py-4 flex flex-col sm:flex-row gap-4 border-b border-white/5 bg-slate-900/10">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        type="text"
                                        placeholder="チーム名、代表者名、電話番号で検索..."
                                        value={teamSearchQuery}
                                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                                        className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                                    />
                                </div>
                                <select
                                    value={teamFilterStatus}
                                    onChange={(e) => setTeamFilterStatus(e.target.value as any)}
                                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-48 p-2.5 outline-none transition-all"
                                >
                                    <option value="all">すべてのステータス</option>
                                    <option value="paid">参加費：支払い済</option>
                                    <option value="unpaid">参加費：未払い</option>
                                </select>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase font-medium text-xs">
                                        <tr>
                                            <th className="px-4 py-3">チーム名</th>
                                            <th className="px-4 py-3 text-center">予選番号</th>
                                            <th className="px-4 py-3">代表者</th>
                                            <th className="px-4 py-3">電話番号</th>
                                            <th className="px-4 py-3">選手数 / 保険</th>
                                            <th className="px-4 py-3">ステータス</th>
                                            <th className="px-4 py-3">支払状況</th>
                                            <th className="px-4 py-3 text-right">アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredEntries.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors text-sm">
                                                <td className="px-4 py-3 font-medium text-white">{entry.teamName}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const assign = lotteryAssignments.get(entry.id);
                                                        if (!assign || !assign.final) return <span className="text-slate-500">-</span>;
                                                        if (assign.bumped) {
                                                            return (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-black text-amber-400 text-lg border-b-2 border-amber-400/50 px-1">{assign.final}</span>
                                                                    <span className="text-[10px] text-slate-500 line-through mt-0.5" title="衝突のため繰り上げ表示">希望: {assign.requested}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return <span className="font-bold text-emerald-400 text-lg px-2 py-1 bg-emerald-500/10 rounded">{assign.final}</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3">{getRepName(entry.userId)}</td>
                                                <td className="px-4 py-3">{getRepPhone(entry.userId)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-white mr-1">{entry.players ? entry.players.length : 0}</span>名
                                                    <span className="text-xs text-slate-500 ml-1">(保: {entry.players ? entry.players.filter(p => p.insurance).length : 0})</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${entry.status === 'submitted' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' : 'bg-amber-900/30 text-amber-400 border border-amber-500/20'}`}>
                                                        {entry.status === 'submitted' ? '確定済' : '下書き'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={async () => {
                                                            const newStatus = !entry.isPaid;
                                                            // Optimistic Update
                                                            setEntries(entries.map(e => e.id === entry.id ? { ...e, isPaid: newStatus } : e));

                                                            try {
                                                                await fetch('/api/admin/entry/update', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ entryId: entry.id, updates: { isPaid: newStatus } })
                                                                });
                                                            } catch (e) {
                                                                alert("更新に失敗しました");
                                                                // Revert
                                                                setEntries(entries.map(e => e.id === entry.id ? { ...e, isPaid: !newStatus } : e));
                                                            }
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${entry.isPaid
                                                            ? 'bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50'
                                                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {entry.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                                                        {entry.isPaid ? '支払い済' : '未払い'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedEntry(entry)}>
                                                        詳細
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredEntries.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                                    該当するチームが見つかりません。
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Team Details Modal (Updated styling to match EditProfileModal) */}
                        {selectedEntry && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                                    onClick={() => setSelectedEntry(null)}
                                />

                                {/* Modal */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col"
                                >
                                    <div className="p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-slate-900/95 backdrop-blur z-20">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white tracking-tight">{selectedEntry.teamName}</h2>
                                            <p className="text-indigo-400 text-sm mt-1 font-medium">{getTournamentName(selectedEntry.tournamentId)}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedEntry(null)}
                                            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-8">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                                                <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">代表者名</p>
                                                <p className="text-white font-medium text-lg">{getRepName(selectedEntry.userId)}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                                                <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">連絡先</p>
                                                <p className="text-white font-mono text-base">{getRepPhone(selectedEntry.userId)}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 sm:col-span-2">
                                                <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">住所</p>
                                                <p className="text-white font-medium">
                                                    <span className="text-sm text-slate-500 mr-2 font-mono">
                                                        〒{users.find(u => u.id === selectedEntry.userId)?.postalCode || "--- - ----"}
                                                    </span>
                                                    {users.find(u => u.id === selectedEntry.userId)?.address || "未登録"}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    登録選手
                                                </h3>
                                                <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                                    計 {selectedEntry.players?.length || 0}名
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {(selectedEntry.players || []).map((player, idx) => (
                                                    <div key={player.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:border-indigo-500/30 transition-colors gap-3">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-sm font-bold text-slate-400">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <p className="text-white font-bold tracking-wide">{player.name}</p>
                                                                    {player.isRepresentative && (
                                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold tracking-wider">
                                                                            代表
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 tracking-widest">{player.furigana}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-12 sm:ml-0">
                                                            <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-md border ${player.wristbandColor === '赤' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                player.wristbandColor === '青' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                }`}>
                                                                WB: {player.wristbandColor || "未定"}
                                                            </span>
                                                            {player.insurance && (
                                                                <span className="text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">
                                                                    保険加入
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>




                    {/* NEW: Group Management Section */}
                    <motion.div variants={itemVariants}>
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-white/5 bg-slate-900/20">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-400" />
                                    グループ編成
                                </h2>
                            </div>
                            <div className="p-6">
                                <GroupManager entries={entries} onSave={loadData} />
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Download Center */}
                        <Card className="p-6 bg-slate-900/40 border-white/5 relative overflow-hidden">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white relative z-10">
                                <FileDown className="w-5 h-5 text-indigo-400" /> 出力・ダウンロード
                            </h2>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 group hover:border-indigo-500/30 transition-colors">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm tracking-wide group-hover:text-indigo-300 transition-colors">保険加入者リスト</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Excel .xlsx</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-8 hover:bg-indigo-500/20" onClick={downloadInsuranceList}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 group hover:border-indigo-500/30 transition-colors">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm tracking-wide group-hover:text-indigo-300 transition-colors">個人名抽選券</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">印刷用 PDF</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-8 hover:bg-indigo-500/20" onClick={() => window.open('/admin/print/lottery', '_blank')}>
                                        <Printer className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 group hover:border-indigo-500/30 transition-colors">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm tracking-wide group-hover:text-indigo-300 transition-colors">詳細チーム・選手情報一覧</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Excel .xlsx</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-8 hover:bg-indigo-500/20" onClick={downloadDetailedTeamList}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Lottery Trigger */}
                        <Card className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 border-none shadow-xl shadow-indigo-500/20 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-3 mb-2 relative z-10">
                                <Ticket className="w-6 h-6 text-white" />
                                <h3 className="text-xl font-bold text-white tracking-tight">抽選システム</h3>
                            </div>
                            <p className="text-indigo-100/80 text-sm mb-6 relative z-10 leading-relaxed">
                                大会イベントで使用する、演出付きの全選手対象のランダム抽選画面を起動します。
                            </p>
                            <Button className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-bold shadow-lg transition-transform active:scale-95 relative z-10" onClick={() => setIsLotteryOpen(true)}>
                                抽選画面をフルスクリーン起動
                            </Button>
                        </Card>

                        {/* Injury Check */}
                        <Card className="p-6 bg-slate-900/40 border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-white font-bold tracking-wide">保険加入 即時チェック</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="選手名またはフリガナ"
                                        className="flex-1 text-sm bg-slate-800/50"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button variant="primary" onClick={handleSearch} className="px-4 shadow-none">検索</Button>
                                </div>
                                {searchResult && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">{searchResult.teamName}</span>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-white text-base">{searchResult.playerName}</span>
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${searchResult.insurance ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {searchResult.insurance ? "保険加入済" : "未加入・対象外"}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                {searchQuery && !searchResult && (
                                    <div className="mt-4 text-sm text-slate-500 text-center bg-slate-800/30 py-3 rounded-xl border border-white/5">
                                        一致するデータが見つかりません
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* NEW: Match Management Section (Stacked Layout) */}
                    <motion.div variants={itemVariants} className="space-y-8">
                        {/* TimeScheduleEditor */}
                        <div>
                            <p className="text-white font-bold mb-2 text-lg">タイムスケジュール</p>
                            <TimeScheduleEditor
                                entries={activeEntries}
                                matches={activeMatches}
                                refreshData={() => {
                                    fetch('/api/matches').then(res => res.json()).then(data => {
                                        if (data.matches) setMatches(data.matches);
                                    });
                                }}
                            />
                        </div>

                        <div>
                            {/* ... Match Table in Card ... */}
                            <Card className="bg-slate-900/40 border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-slate-900/20">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        試合結果管理
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-300">
                                        <thead className="bg-slate-950/50 text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-white/5">
                                            <tr>
                                                <th className="px-6 py-4 w-24">No.</th>
                                                <th className="px-6 py-4 w-40">コート / 時間</th>
                                                <th className="px-6 py-4 text-center">対戦カード</th>
                                                <th className="px-6 py-4 text-center w-32">スコア</th>
                                                <th className="px-6 py-4 text-center w-32">ステータス</th>
                                                <th className="px-6 py-4 text-right w-24">アクション</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-slate-900/10">
                                            {activeMatches.sort((a, b) => (a.matchNumber || '').localeCompare(b.matchNumber || '')).map((match) => (
                                                <tr key={match.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-5 font-mono text-lg font-bold text-slate-500 group-hover:text-indigo-400 transition-colors">
                                                        {match.matchNumber}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-white font-bold tracking-wide text-sm">{match.court} コート</span>
                                                            <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded w-fit">{match.time}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center justify-center gap-5">
                                                            <div className={`flex-1 text-right text-base font-bold tracking-wide ${match.winnerId === match.teamIdA ? 'text-yellow-400' : 'text-slate-200'}`}>
                                                                {getTeamName(match.teamIdA)}
                                                                {match.winnerId === match.teamIdA && <span className="ml-2 inline-block">👑</span>}
                                                            </div>
                                                            <div className="text-slate-600 font-black text-xs px-2 opacity-50">VS</div>
                                                            <div className={`flex-1 text-left text-base font-bold tracking-wide ${match.winnerId === match.teamIdB ? 'text-yellow-400' : 'text-slate-200'}`}>
                                                                {match.winnerId === match.teamIdB && <span className="mr-2 inline-block">👑</span>}
                                                                {getTeamName(match.teamIdB)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        {match.status === 'finished' ? (
                                                            <div className="text-xl font-black text-white font-mono tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                                                                {match.scoreA} <span className="text-slate-600 mx-1">-</span> {match.scoreB}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-600 font-bold">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${match.status === 'finished'
                                                            ? 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                                                            : match.status === 'playing'
                                                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-slate-900'
                                                                : 'bg-slate-800/30 text-slate-500 border-slate-700/30'
                                                            }`}>
                                                            {match.status === 'finished' ? '試合終了' :
                                                                match.status === 'playing' ? '試合中' : '予定・準備'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 font-bold tracking-wide" onClick={() => setSelectedMatch(match)}>
                                                            <Edit2 className="w-4 h-4 mr-1.5" /> 記録
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {activeMatches.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-slate-900/30">
                                                        試合データがありません。スケジュール生成を行ってください。
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </motion.div>

                </motion.div>
            </main>

            {/* Modals */}
            {selectedMatch && (
                <MatchResultModal
                    isOpen={!!selectedMatch}
                    onClose={() => setSelectedMatch(null)}
                    match={selectedMatch}
                    getTeamName={getTeamName}
                    onUpdate={(updatedMatch) => {
                        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
                    }}
                />
            )}

            <LotteryModal
                isOpen={isLotteryOpen}
                onClose={() => setIsLotteryOpen(false)}
                participants={activeEntries.flatMap(entry => {
                    const players = entry.players || [];
                    return players.map(player => ({
                        teamName: entry.teamName,
                        name: player.name,
                        furigana: player.furigana,
                        wristbandColor: player.wristbandColor || 'なし'
                    }));
                })}
            />

            <AnimatePresence>
                {isSettingsModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-2xl"
                        >
                            <Card className="p-6 border-white/5 bg-slate-900/90 relative overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-500/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                                            <Settings className="w-6 h-6 text-indigo-400" />
                                            大会費用設定 (自動計算)
                                        </h2>
                                        <p className="text-sm text-slate-400">こちらの設定は全チームの合計支払額の算出に使用されます。</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-white -mr-2 -mt-2">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {saveMessage && (
                                    <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {saveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                        {saveMessage.text}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-6 border-b border-white/5 pb-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">チーム基本参加費 (円)</label>
                                        <Input
                                            type="number"
                                            value={settings.participationFee}
                                            onChange={(e) => setSettings({ ...settings, participationFee: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                            className="bg-slate-950/80 border-slate-800 text-lg h-12 focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">スポーツ保険料 (1人あたり/円)</label>
                                        <Input
                                            type="number"
                                            value={settings.insuranceFee}
                                            onChange={(e) => setSettings({ ...settings, insuranceFee: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                            className="bg-slate-950/80 border-slate-800 text-lg h-12 focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6 relative z-10 mb-6 border-b border-white/5 pb-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LINEオープンチャットの追加リンク</label>
                                        <Input
                                            type="url"
                                            placeholder="https://line.me/ti/g2/..."
                                            value={settings.lineOpenChatLink || ""}
                                            onChange={(e) => setSettings({ ...settings, lineOpenChatLink: e.target.value })}
                                            className="bg-slate-950/80 border-slate-800 text-sm h-12 focus-visible:ring-emerald-500"
                                        />
                                        <p className="text-xs text-slate-500">※登録完了画面で代表者向けに案内されます。</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-6">
                                    <div className="space-y-3 flex flex-col">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">エントリー締切日</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                value={settings.entryDeadline ? new Date(settings.entryDeadline).toISOString().slice(0, 16) : ""}
                                                onChange={(e) => setSettings({ ...settings, entryDeadline: e.target.value })}
                                                className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 h-12 outline-none"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">※この時間を過ぎると編集や新規登録ができなくなります。</p>
                                    </div>
                                </div>
                                <div className="flex justify-end relative z-10 border-t border-white/5 pt-6 mt-2">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsSettingsModalOpen(false)}
                                            className="text-slate-300 w-full sm:w-auto"
                                        >
                                            閉じる
                                        </Button>
                                        <Button
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 w-full sm:w-auto px-8"
                                        >
                                            {isSavingSettings ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : '設定を保存'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ProjectManagerModal
                isOpen={isProjectManagerOpen}
                onClose={() => setIsProjectManagerOpen(false)}
                projects={projects}
                onProjectsUpdate={setProjects}
            />

        </div>
    );
}
