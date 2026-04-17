"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loader2, Calendar, ArrowLeft, ChevronRight } from "lucide-react";
import { Project, TeamEntry } from "@/lib/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ManagementProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const loadData = async () => {
        try {
            // We just need basic data to show counts. In a massive app, we'd have a specific list endpoint.
            const [projectsRes, dataRes] = await Promise.all([
                fetch('/api/admin/projects'),
                fetch('/api/admin/data')
            ]);
            
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                if (projectsData.projects) {
                    // Filter out inactive projects for the management team
                    setProjects(projectsData.projects.filter((p: Project) => p.isActive));
                }
            }
            if (dataRes.ok) {
                const data = await dataRes.json();
                if (data.entries) setEntries(data.entries);
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
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
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
    };

    const handleLogout = async () => {
        await fetch('/api/management/auth/logout', { method: 'POST' });
        router.push('/management/login');
    };

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8 mb-4 text-emerald-500" /> <span className="text-sm tracking-widest text-slate-400">データ読み込み中...</span></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Management Portal</h1>
                    </div>
                    <div>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleLogout}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> <span className="text-xs sm:text-sm">ログアウト</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8 pl-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">大会の選択</h2>
                    <p className="text-slate-400 text-sm">管理するプロジェクト（大会）を選んでください。</p>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-white/5">
                        <p className="text-slate-500">現在有効なプロジェクトがありません。</p>
                    </div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map(project => {
                            const projectEntries = entries.filter(e => e.tournamentId === project.id && e.status !== 'cancelled');
                            const confirmedCount = project.maxTeams ? Math.min(projectEntries.length, project.maxTeams) : projectEntries.length;
                            const waitlistCount = project.maxTeams ? Math.max(0, projectEntries.length - project.maxTeams) : 0;
                            
                            return (
                                <motion.div variants={itemVariants} key={project.id}>
                                    <Link href={`/management/${project.id}`}>
                                        <Card className="group relative overflow-hidden bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/50 hover:border-emerald-500/50 transition-all p-6 cursor-pointer flex flex-col h-full">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-transform">
                                                <Calendar className="w-16 h-16 text-emerald-400" />
                                            </div>
                                            
                                            <div className="flex-1 relative z-10">
                                                <h3 className="text-xl font-bold text-white mb-4 line-clamp-2">{project.name}</h3>
                                                
                                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                                    <div className="bg-slate-950/50 rounded-lg px-3 py-2 border border-white/5">
                                                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold mb-0.5">エントリー状況</span>
                                                        <span className="text-lg font-black text-white">
                                                            {confirmedCount}
                                                            {project.maxTeams && <span className="text-sm font-medium text-slate-400 ml-1">/ {project.maxTeams} 枠</span>}
                                                        </span>
                                                    </div>
                                                    
                                                    {waitlistCount > 0 && (
                                                        <div className="bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-500/20">
                                                            <span className="text-[10px] text-amber-500 block uppercase tracking-wider font-bold mb-0.5">キャンセル待ち</span>
                                                            <span className="text-lg font-bold text-amber-400">{waitlistCount} <span className="text-xs">組</span></span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between text-emerald-400 relative z-10 font-bold text-sm">
                                                <span>リストを確認する</span>
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
