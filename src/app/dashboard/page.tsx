"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { Card } from "@/components/ui/Card";
import { User, TeamEntry, Project, Setting } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Trophy, Plus, History, Calendar, LogOut, Loader2, User as UserIcon, Settings, Target, ArrowRight, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getTournamentName } from "@/lib/tournament-constants";
import { motion } from "framer-motion";

export default function UserDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [settings, setSettings] = useState<Setting | any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    useEffect(() => {
        // 1. Check Session
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            router.push('/login');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
        } catch (e) {
            localStorage.removeItem('currentUser');
            router.push('/login');
            return;
        }

        // 2. Fetch Data
        const fetchData = async () => {
            try {
                const [entriesRes, projectsRes, settingsRes] = await Promise.all([
                    fetch(`/api/user/entries?userId=${parsedUser.id}`),
                    fetch('/api/admin/projects'),
                    fetch('/api/settings')
                ]);
                const entriesData = await entriesRes.json();
                const projectsData = await projectsRes.json();
                const settingsData = await settingsRes.json();

                if (entriesData.entries) setEntries(entriesData.entries);
                if (projectsData.projects) setProjects(projectsData.projects);
                if (settingsData) setSettings(settingsData);
            } catch (e) {
                console.error("Failed to fetch data", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        router.push('/login');
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );
    if (!user) return null;

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

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight hidden sm:block">vankycup</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> <span className="text-xs sm:text-sm font-medium">トップへ戻る</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="max-w-6xl mx-auto"
                >
                    {/* Welcome Section */}
                    <motion.div variants={itemVariants} className="mb-10">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">マイページ</h2>
                        <p className="text-slate-400 text-sm sm:text-base">登録情報の管理や、大会へのエントリー状況を確認できます。</p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Profile */}
                        <div className="space-y-6">
                            <motion.div variants={itemVariants}>
                                <Card>
                                    <div className="flex items-center gap-2 mb-6 text-slate-400">
                                        <UserIcon className="w-5 h-5" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">アカウント情報</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">代表者氏名</label>
                                            <p className="text-white font-medium text-lg">{user.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">メールアドレス</label>
                                            <p className="text-white font-medium">{user.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">電話番号</label>
                                            <p className="text-white font-medium">{user.phone}</p>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-700/50">
                                        <Button
                                            variant="outline"
                                            className="w-full text-sm flex items-center gap-2"
                                            onClick={() => setIsEditProfileOpen(true)}
                                        >
                                            <Settings className="w-4 h-4" /> プロフィール編集
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>

                            {(() => {
                                const userProjectsWithChat = projects.filter(p => {
                                    if (!p.lineOpenChatLink) return false;
                                    if (!entries.some(e => e.tournamentId === p.id)) return false;

                                    // エントリー終了日から1ヶ月（30日）経過している場合は非表示にする
                                    if (p.entryEndDate) {
                                        const endDate = new Date(p.entryEndDate);
                                        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                                        const now = new Date();
                                        if (now.getTime() - endDate.getTime() > thirtyDaysMs) {
                                            return false;
                                        }
                                    }
                                    return true;
                                });

                                if (userProjectsWithChat.length === 0 && settings.lineOpenChatLink) {
                                    // Fallback to global setting if no specific project links are found but a global one exists
                                    // Make sure we only show global fallback if they have an active entry (not older than 30 days past deadline)
                                    const hasActiveEntry = projects.some(p => {
                                        if (!entries.some(e => e.tournamentId === p.id)) return false;
                                        if (p.entryEndDate) {
                                            const endDate = new Date(p.entryEndDate);
                                            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                                            if (new Date().getTime() - endDate.getTime() > thirtyDaysMs) {
                                                return false;
                                            }
                                        }
                                        return true;
                                    });
                                    if (hasActiveEntry) {
                                        userProjectsWithChat.push({ id: 'global', name: '大会オープンチャット', lineOpenChatLink: settings.lineOpenChatLink } as any);
                                    }
                                }

                                return userProjectsWithChat.length > 0 && (
                                    <motion.div variants={itemVariants}>
                                        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 backdrop-blur-md rounded-2xl p-6 border border-indigo-500/20 shadow-xl space-y-4">
                                            <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                                                <MessageCircle className="w-5 h-5" /> LINEオープンチャット (必須)
                                            </h4>
                                            <p className="text-sm text-emerald-100/70 leading-relaxed">
                                                リーダーの方へ、大会の集合時間や重要な連絡を配信します。参加する大会のチャットに必ず参加してください。
                                            </p>
                                            <div className="space-y-2 mt-4">
                                                {userProjectsWithChat.map(p => (
                                                    <a key={p.id} href={p.lineOpenChatLink} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/50 transition-colors group">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-slate-200">{p.name}</span>
                                                            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                                                参加する <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                            </div>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </div>

                        {/* Right Column: Entries */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Actions */}
                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                    エントリー中の大会
                                </h3>
                                <Link href="/team/register" className="w-full sm:w-auto">
                                    <Button variant="primary" className="w-full sm:w-auto">
                                        <Plus className="w-5 h-5 mr-2" /> 新規エントリー
                                    </Button>
                                </Link>
                            </motion.div>

                            {/* Active Entries Section */}
                            <motion.section variants={itemVariants}>
                                {entries.length === 0 ? (
                                    <Card className="p-12 border-dashed border-slate-700/50 bg-slate-900/20 text-center">
                                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Trophy className="w-10 h-10 text-slate-500" />
                                        </div>
                                        <h4 className="text-xl font-medium text-slate-200 mb-3">エントリーはありません</h4>
                                        <p className="text-slate-400 mb-8 leading-relaxed">
                                            現在開催中の大会にエントリーして、<br className="hidden sm:block" />
                                            チームの力を試しましょう！
                                        </p>
                                        <Link href="/team/register">
                                            <Button variant="secondary" size="lg">大会を探す</Button>
                                        </Link>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {entries.map((entry, i) => (
                                            <motion.div
                                                key={entry.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                            >
                                                <Link href={`/team/dashboard?id=${entry.id}`} className="block group">
                                                    <Card className="p-0 overflow-hidden hover:border-indigo-500/40 transition-all duration-300">
                                                        <div className="flex flex-col sm:flex-row relative">
                                                            {/* Status Indicator Bar */}
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${entry.status === 'submitted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                                                            <div className="p-6 pl-8 flex-1">
                                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                                    <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/5 text-slate-300 border border-white/10">
                                                                        {(entry as any).projectName || entry.tournamentId}
                                                                    </div>
                                                                    <div className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${entry.status === 'submitted'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                        }`}>
                                                                        {entry.status === 'submitted' ? (
                                                                            <span className="relative flex h-2 w-2">
                                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                            </span>
                                                                        ) : null}
                                                                        {entry.status === 'submitted' ? '登録完了' : '下書き'}
                                                                    </div>
                                                                </div>

                                                                <h4 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors mb-4">
                                                                    {entry.teamName}
                                                                </h4>

                                                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-400">
                                                                    <span className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1 rounded-lg">
                                                                        <UserIcon className="w-4 h-4 text-indigo-400" /> 選手 {entry.players?.length || 0}名
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <History className="w-4 h-4" /> 最終更新: {new Date(entry.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="px-4 pb-4 sm:p-6 flex items-center justify-center sm:justify-end sm:border-l border-white/5 bg-white/[0.02] mt-2 sm:mt-0">
                                                                <div className="w-full sm:w-auto bg-indigo-500/10 sm:bg-transparent border border-indigo-500/30 sm:border-transparent rounded-lg sm:rounded-none py-2.5 sm:py-0 flex items-center justify-center gap-2 text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                                                    詳細を確認 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.section>

                            {/* Past Entries Section */}
                            <motion.section variants={itemVariants}>
                                <div className="flex items-center gap-2 mb-4 text-slate-400 px-2">
                                    <History className="w-5 h-5" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">過去の大会履歴</h3>
                                </div>
                                <div className="p-8 bg-slate-900/20 rounded-2xl border border-white/5 text-center text-slate-500 backdrop-blur-sm">
                                    <p>過去に参加した大会の履歴がありません</p>
                                </div>
                            </motion.section>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Modals */}
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                user={user}
                onSave={(updatedUser) => {
                    setUser(updatedUser);
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                }}
            />
        </div>
    );
}
