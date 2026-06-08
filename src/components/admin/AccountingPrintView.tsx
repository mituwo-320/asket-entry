"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamEntry, Project } from "@/lib/types";

export default function AccountingPrintView({ backUrl }: { backUrl: string }) {
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

    useEffect(() => {
        if (project) {
            document.title = `受付リスト_${project.name}`;
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

    // Calculate wristband colors (Global and Per Team)
    const globalWristbands: Record<string, number> = {};
    const teamWristbands: Record<string, Record<string, number>> = {};

    targetEntries.forEach(entry => {
        teamWristbands[entry.id] = {};
        entry.players?.forEach(player => {
            const color = player.wristbandColor || "未定";
            globalWristbands[color] = (globalWristbands[color] || 0) + 1;
            teamWristbands[entry.id][color] = (teamWristbands[entry.id][color] || 0) + 1;
        });
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
                {/* PAGE 1: Global Summary */}
                <div className="page-wrapper w-full max-w-[210mm] mx-auto bg-white p-6 sm:p-[10mm] print:p-[15mm] shadow-xl my-8 print:my-0 print:shadow-none flex flex-col">
                    <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
                        <p className="text-sm font-bold text-slate-500 mb-1">【大会全体 受付準備シート】</p>
                        <h1 className="text-2xl font-black tracking-widest text-slate-800 mb-2">{project.name}</h1>
                        <p className="text-sm font-bold text-slate-600">{formattedDate || "＿＿年＿＿月＿＿日（＿＿）"}</p>
                    </div>

                    <div className="mt-4">
                        <h2 className="text-xl font-black text-slate-800 mb-4 border-l-4 border-indigo-600 pl-3">リストバンド準備数（全体合計）</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {(() => {
                                const colorsToShow = ["赤", "青", "黄"];
                                const otherColors = Object.keys(globalWristbands).filter(
                                    c => !colorsToShow.includes(c) && globalWristbands[c] > 0
                                );
                                return [...colorsToShow, ...otherColors].map(color => {
                                    const count = globalWristbands[color] || 0;
                                    return (
                                        <div key={color} className="border-2 border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50">
                                            <span className="text-sm font-bold text-slate-500 mb-1">{color}</span>
                                            <span className="text-4xl font-black">{count} <span className="text-base font-bold ml-1">個</span></span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                {/* PAGE 2+: Team Specific Pages */}
                {targetEntries.map((entry, index) => {
                    const teamColorCounts = teamWristbands[entry.id] || {};
                    const playerCount = entry.players?.length || 0;
                    const insCount = entry.players?.filter(p => p.insurance).length || 0;
                    const participationTotal = playerCount * settings.participationFee;
                    const insuranceTotal = insCount * settings.insuranceFee;
                    const teamGrandTotal = participationTotal + insuranceTotal;
                    
                    return (
                        <div key={entry.id} className="page-wrapper w-full max-w-[210mm] mx-auto bg-white p-4 sm:p-[6mm] print:p-[5mm] shadow-xl my-4 print:my-0 print:shadow-none flex flex-col">
                            
                            {/* Header Section */}
                            <div className="border-b border-slate-800 pb-1 mb-1">
                                <div className="flex justify-between items-end mb-1">
                                    <h1 className="text-lg font-black tracking-wider text-slate-800 leading-tight">{project.name}</h1>
                                    <div className="text-xs font-bold text-slate-600 whitespace-nowrap ml-2">
                                        実施日: {formattedDate || "＿＿年＿＿月＿＿日（＿＿）"}
                                    </div>
                                </div>
                            </div>

                            {/* Team Title & Wristband Summary */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 mb-0">{entry.teamNameKana || "フリガナ未登録"}</p>
                                    <h2 className="text-xl font-black mb-0 leading-tight line-clamp-2">{entry.teamName}</h2>
                                    
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded">配付数</span>
                                        <div className="flex gap-2">
                                            {(() => {
                                                const colorsToShow = ["赤", "青", "黄"];
                                                const otherColors = Object.keys(teamColorCounts).filter(
                                                    c => !colorsToShow.includes(c) && teamColorCounts[c] > 0
                                                );
                                                return [...colorsToShow, ...otherColors].map(color => {
                                                    const count = teamColorCounts[color] || 0;
                                                    return (
                                                        <div key={color} className="flex items-end gap-1">
                                                            <span className="text-xs font-bold">{color}:</span>
                                                            <span className="text-base font-black leading-none">{count}</span>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right flex items-end gap-2">
                                    <div className="text-left text-[10px] font-bold text-slate-600">
                                        <div className="flex justify-between gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
                                            <span>参加:</span>
                                            <span>¥{participationTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
                                            <span>保険:</span>
                                            <span>¥{insuranceTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between gap-2 text-xs text-slate-800">
                                            <span>合計:</span>
                                            <span className="font-black">¥{teamGrandTotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="inline-block border border-slate-800 rounded p-1 text-center min-w-[60px]">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0">登録数</p>
                                        <p className="text-xl font-black leading-none">{playerCount}<span className="text-[10px] font-medium ml-0.5 text-slate-600">名</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Player List */}
                            <div className="mb-2">
                                <h3 className="font-bold text-slate-800 mb-0.5 border-l-4 border-slate-800 pl-1.5 text-xs flex justify-between items-end">
                                    <span>登録選手一覧</span>
                                </h3>
                                <table className="w-full text-[11px] border-collapse border border-slate-800">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-800 px-1 py-0.5 text-center w-6">No.</th>
                                            <th className="border border-slate-800 px-1 py-0.5 text-left">氏名 (フリガナ)</th>
                                            <th className="border border-slate-800 px-1 py-0.5 text-center w-24">バンド色</th>
                                            <th className="border border-slate-800 px-1 py-0.5 text-center w-12">保険</th>
                                            <th className="border border-slate-800 px-1 py-0.5 text-center w-16 bg-slate-200">欠席</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(entry.players || []).map((player, idx) => (
                                            <tr key={player.id || idx}>
                                                <td className="border border-slate-800 px-1 py-0.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                                <td className="border border-slate-800 px-1 py-0.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-slate-500 leading-none">{player.furigana}</span>
                                                        <span className="font-bold">{player.name}</span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-800 px-1 py-0.5 text-center font-bold">
                                                    {player.wristbandColor || "未定"}
                                                </td>
                                                <td className="border border-slate-800 px-1 py-0.5 text-center font-bold">
                                                    {player.insurance ? "〇" : "×"}
                                                </td>
                                                {/* Absent Checkbox Area */}
                                                <td className="border border-slate-800 px-1 py-0.5 text-center align-middle">
                                                    <div className="w-4 h-4 border border-slate-300 mx-auto rounded-sm"></div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Additional Players Section */}
                            <div className="mt-auto pt-2">
                                <h3 className="font-bold text-slate-800 mb-0.5 border-l-4 border-emerald-600 pl-1.5 text-xs flex items-center gap-2">
                                    <span>当日追加選手 記入欄</span>
                                    <span className="text-[10px] font-normal text-slate-500">※参加費: ¥{settings.participationFee.toLocaleString()}</span>
                                </h3>
                                <table className="w-full text-xs border-collapse border border-slate-800">
                                    <thead className="bg-emerald-50">
                                        <tr>
                                            <th className="border border-slate-800 p-1 text-left w-1/2 text-emerald-900">氏名</th>
                                            <th className="border border-slate-800 p-1 text-center w-1/4 text-emerald-900">リストバンド色</th>
                                            <th className="border border-slate-800 p-1 text-center w-1/4 bg-emerald-100 text-emerald-900">参加費 徴収</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3].map((num) => (
                                            <tr key={num} className="h-8">
                                                <td className="border border-slate-800 p-1"></td>
                                                <td className="border border-slate-800 p-1 text-center"></td>
                                                <td className="border border-slate-800 p-1 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                                                        <span className="text-[9px] text-slate-400">済</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
