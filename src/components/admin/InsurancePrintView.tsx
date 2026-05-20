"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamEntry, Project } from "@/lib/types";

export default function InsurancePrintView({ backUrl }: { backUrl: string }) {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [dataRes, projectsRes] = await Promise.all([
                    fetch('/api/admin/data'),
                    fetch('/api/admin/projects')
                ]);

                if (dataRes.ok) {
                    const data = await dataRes.json();
                    if (data.entries) setEntries(data.entries);
                }

                if (projectsRes.ok) {
                    const data = await projectsRes.json();
                    if (data.projects) {
                        const p = data.projects.find((p: Project) => p.id === projectId);
                        if (p) setProject(p);
                    }
                }
            } catch (e) {
                console.error("Error fetching data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    if (!projectId) return <div className="min-h-screen bg-white flex items-center justify-center">Invalid parameters</div>;
    if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    if (!project) return <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="mb-4">プロジェクトが見つかりません</p>
        <Link href={backUrl} className="text-indigo-600 underline">戻る</Link>
    </div>;

    // Filter valid entries (exclude cancelled)
    // Exclude waitlisted based on maxTeams
    const validEntries = entries.filter(e => e.tournamentId === projectId && e.status !== 'cancelled');
    const sorted = [...validEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    let targetEntries: TeamEntry[] = [];
    if (project.maxTeams) {
        targetEntries = sorted.slice(0, project.maxTeams);
    } else {
        targetEntries = sorted;
    }

    // Extract all insured players
    const insuredPlayers: { name: string, teamName: string }[] = [];
    targetEntries.forEach(entry => {
        if (entry.players) {
            entry.players.forEach(p => {
                if (p.insurance) {
                    insuredPlayers.push({ name: p.name, teamName: entry.teamName });
                }
            });
        }
    });

    // Format tournament date
    let formattedDate = "";
    const targetDate = project.eventDate || project.entryStartDate;
    if (targetDate) {
        const d = new Date(targetDate);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        formattedDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Non-printable Top Bar */}
            <div className="print:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md flex items-center justify-between">
                <Link href={backUrl} className="flex items-center text-slate-300 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    管理画面へ戻る
                </Link>
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2 font-bold transition-colors shadow-lg"
                >
                    <Printer className="w-4 h-4" />
                    PDFとして保存・印刷
                </button>
            </div>

            <div className="print-container">
                <div className="page-wrapper w-full max-w-[210mm] mx-auto bg-white p-6 sm:p-[10mm] print:p-[15mm] shadow-xl my-8 print:my-0 print:shadow-none flex flex-col min-h-[297mm]">
                    
                    {/* Header Section */}
                    <div className="border-b-2 border-slate-800 pb-2 mb-6">
                        <h1 className="text-2xl font-black tracking-widest text-center text-slate-800 mb-2">保険加入者リスト</h1>
                        <p className="text-center text-slate-600 font-bold">{project.name}</p>
                    </div>

                    {/* Insured Players List */}
                    <div className="flex-1">
                        {insuredPlayers.length === 0 ? (
                            <p className="text-center text-slate-500 my-10">保険加入者はいません。</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {insuredPlayers.map((p, idx) => (
                                    <div key={idx} className="flex border-b border-slate-300 border-dashed py-1">
                                        <div className="w-8 text-right text-slate-400 font-mono text-sm mr-2">{idx + 1}.</div>
                                        <div className="font-bold text-sm flex-1">{p.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Credits */}
                    <div className="mt-8 pt-4 border-t-2 border-slate-800 flex justify-between items-end">
                        <div className="text-sm leading-relaxed">
                            <p><span className="font-bold w-16 inline-block">大会名：</span>{project.name}</p>
                            <p><span className="font-bold w-16 inline-block">日付：</span>{formattedDate || "＿＿年＿＿月＿＿日（＿＿）"}</p>
                            <p><span className="font-bold w-16 inline-block">場所：</span>＿＿＿＿＿＿＿＿＿＿＿＿</p>
                            <p><span className="font-bold w-16 inline-block">主催：</span>細本龍男</p>
                            <p><span className="font-bold w-16 inline-block">代表：</span>細本龍男</p>
                            <p><span className="font-bold w-16 inline-block">連絡先：</span>070-8369-8316</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-500 mb-1">合計人数</p>
                            <p className="text-3xl font-black">{insuredPlayers.length} <span className="text-base font-bold ml-1">名</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0;
                        padding: 0;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    .page-wrapper {
                        page-break-after: always;
                    }
                    .page-wrapper:last-child {
                        page-break-after: auto;
                    }
                }
            `}</style>
        </div>
    );
}
