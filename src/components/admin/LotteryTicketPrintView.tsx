"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft, Scissors } from "lucide-react";
import Link from "next/link";
import { TeamEntry, Project } from "@/lib/types";

interface LotteryTicket {
    id: string;
    teamName: string;
    playerName: string;
    wristbandColor: string;
    isBlank?: boolean;
}

export default function LotteryTicketPrintView({ backUrl }: { backUrl: string }) {
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

    useEffect(() => {
        if (project) {
            document.title = `抽選券_${project.name}`;
        }
    }, [project]);

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

    // Build tickets
    const tickets: LotteryTicket[] = [];
    
    targetEntries.forEach((entry, eIdx) => {
        entry.players?.forEach((player, pIdx) => {
            tickets.push({
                id: `ticket-${eIdx}-${pIdx}`,
                teamName: entry.teamName,
                playerName: player.name,
                wristbandColor: player.wristbandColor || "未定"
            });
        });
    });

    // Add 20 blank tickets for day-of additions
    for (let i = 0; i < 20; i++) {
        tickets.push({
            id: `blank-${i}`,
            teamName: "",
            playerName: "",
            wristbandColor: "",
            isBlank: true
        });
    }

    // Split tickets into chunks for A4 pages (e.g. 10 tickets per page depending on size)
    // We will let CSS handle page breaks for printing by using page-break-inside: avoid
    // but wrapping them in a container works fine.

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
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

            <div className="print-container w-full max-w-[210mm] mx-auto mt-8 print:mt-0 bg-white shadow-xl print:shadow-none p-4 sm:p-[10mm] print:p-[5mm]">
                <div className="print:hidden mb-4 p-4 bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500 rounded text-sm flex items-center gap-2">
                    <Scissors className="w-5 h-5 shrink-0" />
                    <span>このページはA4用紙に印刷し、点線に沿って切り取ることで「抽選券」としてご利用いただけます。下部に当日追加用の空欄チケットが20枚付いています。</span>
                </div>

                <div className="flex flex-col">
                    {tickets.map((ticket) => (
                        <div 
                            key={ticket.id} 
                            className="ticket-row border-b-2 border-dashed border-slate-400 py-4 flex items-stretch gap-2 break-inside-avoid"
                        >
                            <div className="w-8 flex-shrink-0 flex items-center justify-center border-r-2 border-dashed border-slate-300">
                                <Scissors className="w-4 h-4 text-slate-300 -rotate-90" />
                            </div>
                            
                            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                {/* Team Name */}
                                <div className="col-span-5 flex flex-col justify-center px-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">チーム名</span>
                                    {ticket.isBlank ? (
                                        <div className="border-b border-slate-300 h-6 w-full"></div>
                                    ) : (
                                        <span className="text-base font-bold text-slate-800 truncate">{ticket.teamName}</span>
                                    )}
                                </div>
                                
                                {/* Player Name */}
                                <div className="col-span-5 flex flex-col justify-center px-2 border-l border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">氏名</span>
                                    {ticket.isBlank ? (
                                        <div className="border-b border-slate-300 h-6 w-full"></div>
                                    ) : (
                                        <span className="text-lg font-black text-slate-900 truncate">{ticket.playerName}</span>
                                    )}
                                </div>

                                {/* Wristband Color */}
                                <div className="col-span-2 flex flex-col justify-center px-2 border-l border-slate-200 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">色</span>
                                    {ticket.isBlank ? (
                                        <div className="border-b border-slate-300 h-6 w-3/4 mx-auto"></div>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-700 bg-slate-100 rounded px-2 py-0.5 inline-block">{ticket.wristbandColor}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
                        margin: 5mm;
                    }
                    .ticket-row {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}
