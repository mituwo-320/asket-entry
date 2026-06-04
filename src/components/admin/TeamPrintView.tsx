"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamEntry, User, Project } from "@/lib/types";

export default function TeamPrintView({ backUrl }: { backUrl: string }) {
    const searchParams = useSearchParams();
    const teamId = searchParams.get('teamId');
    const projectId = searchParams.get('projectId');

    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!teamId && !projectId) {
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
                    if (data.users) setUsers(data.users);
                }

                if (projectsRes.ok) {
                    const data = await projectsRes.json();
                    if (data.projects) setProjects(data.projects);
                }
            } catch (e) {
                console.error("Error fetching data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [teamId, projectId]);

    // Filter target teams
    let targetEntries: TeamEntry[] = [];
    let projectContext: Project | undefined;

    if (teamId) {
        const t = entries.find(e => e.id === teamId);
        if (t) targetEntries.push(t);
        projectContext = projects.find(p => p.id === t?.tournamentId);
    } else if (projectId) {
        projectContext = projects.find(p => p.id === projectId);
        // Exclude cancelled
        const validEntries = entries.filter(e => e.tournamentId === projectId && e.status !== 'cancelled');
        // Exclude waitlisted based on maxTeams
        const sorted = [...validEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        if (projectContext?.maxTeams) {
            targetEntries = sorted.slice(0, projectContext.maxTeams);
        } else {
            targetEntries = sorted;
        }
    }

    useEffect(() => {
        if (projectContext) {
            document.title = `確定エントリー一覧_${projectContext.name}`;
        } else if (targetEntries.length > 0) {
            document.title = `チーム情報_${targetEntries[0].teamName}`;
        }
    }, [projectContext, targetEntries]);

    if (!teamId && !projectId) return <div className="min-h-screen bg-white flex items-center justify-center">Invalid parameters</div>;
    if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    if (targetEntries.length === 0) return <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="mb-4">印刷対象のチームが見つかりません</p>
        <Link href={backUrl} className="text-indigo-600 underline">戻る</Link>
    </div>;

    // Format tournament date
    let formattedDate = "";
    if (projectContext?.entryStartDate) {
        const d = new Date(projectContext.entryStartDate);
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
                {targetEntries.map((entry, index) => {
                    // Find representative info
                    const repPlayer = entry.players?.find(p => p.isRepresentative) || entry.players?.[0];
                    const user = users.find(u => u.id === entry.userId);
                    
                    const repName = repPlayer?.name || user?.name || "不明";
                    const repFurigana = repPlayer?.furigana || "不明";
                    const repPhone = user?.phone || "不明";
                    
                    return (
                        <div key={entry.id} className="page-wrapper w-full max-w-[210mm] mx-auto bg-white p-6 sm:p-[10mm] print:p-[3mm] shadow-xl my-8 print:my-0 print:shadow-none flex flex-col">
                            
                            {/* Header Section */}
                            <div className="border-b border-slate-800 pb-1 mb-2">
                                <div className="flex justify-between items-end mb-1">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-800 leading-tight">{projectContext?.name || entry.tournamentId}</h1>
                                    <div className="text-sm font-bold text-slate-600 whitespace-nowrap ml-4">
                                        実施日: {formattedDate ? formattedDate : "＿＿年＿＿月＿＿日（＿＿）"}
                                    </div>
                                </div>
                            </div>

                            {/* Team Title & Representative */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-0.5">{entry.teamNameKana || "フリガナ未登録"}</p>
                                    <h2 className="text-2xl sm:text-3xl font-black mb-1 leading-tight">{entry.teamName}</h2>
                                    
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 text-[9px] font-bold rounded">代表者</span>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 leading-none">{repFurigana}</span>
                                                <span className="text-xs sm:text-sm font-bold leading-tight">{repName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 border-l-2 border-slate-300 pl-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ユニフォーム色:</span>
                                            {entry.uniformColor ? (
                                                <span className="text-sm font-bold">{entry.uniformColor}</span>
                                            ) : (
                                                <span className="w-24 border-b border-slate-400 border-dashed inline-block h-4"></span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <div className="inline-block border-2 border-slate-800 rounded-lg p-2 text-center mb-1 min-w-[100px]">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">選手数</p>
                                        <p className="text-3xl font-black leading-none">{entry.players?.length || 0}<span className="text-xs font-medium ml-1 text-slate-600">名</span></p>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 flex items-center justify-end gap-1">
                                        TEL: {repPhone}
                                    </p>
                                </div>
                            </div>

                            {/* Player List */}
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 mb-1 border-l-4 border-slate-800 pl-2 text-sm">登録選手一覧</h3>
                                <table className="w-full text-xs border-collapse border border-slate-800">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-800 p-1 sm:p-1.5 text-center w-8 sm:w-12">No.</th>
                                            <th className="border border-slate-800 p-1 sm:p-1.5 text-left">氏名 (フリガナ)</th>
                                            <th className="border border-slate-800 p-1 sm:p-1.5 text-center w-16 sm:w-20">代表者</th>
                                            <th className="border border-slate-800 p-1 sm:p-1.5 text-center w-24 sm:w-32">リストバンド色</th>
                                            <th className="border border-slate-800 p-1 sm:p-1.5 text-center w-16 sm:w-20">保険</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(entry.players || []).map((player, idx) => (
                                            <tr key={player.id || idx}>
                                                <td className="border border-slate-800 p-1 sm:p-1.5 text-center font-bold">{idx + 1}</td>
                                                <td className="border border-slate-800 p-1 sm:p-1.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] sm:text-[9px] text-slate-500 leading-none">{player.furigana}</span>
                                                        <span className="font-bold">{player.name}</span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-800 p-1 sm:p-1.5 text-center font-bold text-base leading-none">
                                                    {player.isRepresentative ? "〇" : ""}
                                                </td>
                                                <td className="border border-slate-800 p-1 sm:p-1.5 text-center font-bold">
                                                    {player.wristbandColor || "未定"}
                                                </td>
                                                <td className="border border-slate-800 p-1 sm:p-1.5 text-center font-bold text-base leading-none">
                                                    {player.insurance ? "〇" : "×"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4">
                                <h3 className="font-bold text-slate-800 mb-1 border-l-4 border-slate-800 pl-2 text-xs sm:text-sm">チーム紹介・意気込み</h3>
                                <div className="border border-slate-800 p-2 min-h-[40px] text-xs whitespace-pre-wrap leading-relaxed">
                                    {entry.teamIntroduction || "（未記入）"}
                                </div>
                            </div>
                        </div>
                    );
                })}
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
