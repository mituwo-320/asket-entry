"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamEntry, Project } from "@/lib/types";

export default function AccountingSummaryPrintView({ backUrl }: { backUrl: string }) {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [settings, setSettings] = useState<{ participationFee: number, insuranceFee: number }>({ participationFee: 0, insuranceFee: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [dataRes, projectsRes, settingsRes] = await Promise.all([
                    fetch('/api/admin/data'),
                    fetch('/api/admin/projects'),
                    fetch('/api/settings')
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

                if (settingsRes.ok) {
                    const s = await settingsRes.json();
                    setSettings({ participationFee: Number(s.participationFee || 0), insuranceFee: Number(s.insuranceFee || 0) });
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
    const validEntries = entries.filter(e => e.tournamentId === projectId && e.status !== 'cancelled');
    const sorted = [...validEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    let targetEntries: TeamEntry[] = [];
    if (project.maxTeams) {
        targetEntries = sorted.slice(0, project.maxTeams);
    } else {
        targetEntries = sorted;
    }

    // Calculate accounting details
    let projectTotalAmount = 0;
    const teamAccountingList = targetEntries.map(entry => {
        const playerCount = entry.players ? entry.players.length : 0;
        const insCount = entry.players ? entry.players.filter(p => p.insurance).length : 0;
        
        const participationTotal = playerCount * settings.participationFee;
        const insuranceTotal = insCount * settings.insuranceFee;
        const total = participationTotal + insuranceTotal;

        projectTotalAmount += total;

        return {
            teamName: entry.teamName,
            playerCount: playerCount,
            participationFee: participationTotal,
            insuranceFee: insuranceTotal,
            total: total
        };
    });

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
                    <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
                        <p className="text-sm font-bold text-slate-500 mb-1">【清算リスト】</p>
                        <h1 className="text-2xl font-black tracking-widest text-slate-800 mb-4">{project.name}</h1>
                        <div className="inline-block bg-slate-100 border-2 border-slate-800 rounded-xl px-8 py-3">
                            <p className="text-sm font-bold text-slate-600 mb-1">総合計金額</p>
                            <p className="text-4xl font-black text-slate-900 leading-none">¥{projectTotalAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Accounting List */}
                    <div className="flex-1">
                        {teamAccountingList.length === 0 ? (
                            <p className="text-center text-slate-500 my-10">確定チームはありません。</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                {teamAccountingList.map((team, idx) => (
                                    <div key={idx} className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 flex flex-col">
                                        <div className="font-black border-b border-slate-300 pb-2 mb-2 flex justify-between items-start gap-2 min-h-[2.5rem]">
                                            <span className="text-[15px] leading-snug break-words">{team.teamName}</span>
                                            <span className="text-sm font-bold text-slate-500 shrink-0 whitespace-nowrap mt-0.5">{team.playerCount}名</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 text-sm font-bold">
                                            <div className="text-slate-500">参加費</div>
                                            <div className="text-right">¥{team.participationFee.toLocaleString()}</div>
                                            <div className="text-slate-500">保険料</div>
                                            <div className="text-right">¥{team.insuranceFee.toLocaleString()}</div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-end">
                                            <div className="text-xs font-bold text-slate-500">合計</div>
                                            <div className="text-xl font-black">¥{team.total.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
