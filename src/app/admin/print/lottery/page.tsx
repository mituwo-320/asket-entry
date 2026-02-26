"use client";

import { useEffect, useState } from "react";
import { TeamEntry } from "@/lib/types";
import { Loader2, Printer, Ticket, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LotteryPrintPage() {
    const [entries, setEntries] = useState<TeamEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch Admin Data directly or appropriate endpoint
        fetch('/api/admin/data')
            .then(res => res.json())
            .then(data => {
                if (data.entries) setEntries(data.entries);
                setIsLoading(false);
            })
            .catch(e => {
                console.error(e);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
            </div>
        );
    }

    // Flatten players
    const tickets = entries.flatMap(entry => {
        return (entry.players || []).map(player => ({
            teamName: entry.teamName,
            playerName: player.name,
            furigana: player.furigana,
            wristband: player.wristbandColor
        }));
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 print:p-0 print:bg-white">
            {/* No-Print Header */}
            <div className="max-w-4xl mx-auto mb-8 print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
                            <ChevronLeft className="w-4 h-4 mr-1" /> ダッシュボードに戻る
                        </Link>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                            <Ticket className="w-6 h-6 text-indigo-500" />
                            個人名抽選券 印刷用フォーマット
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">印刷時はA4サイズ・余白なしを推奨します。</p>
                    </div>
                    <Button onClick={() => window.print()} variant="primary" className="w-full sm:w-auto shadow-indigo-500/20">
                        <Printer className="w-5 h-5 mr-2" /> PDF保存 / 印刷する
                    </Button>
                </div>
            </div>

            {/* A4 Grid Wrapper */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 print:block print:gap-0">
                {tickets.map((ticket, idx) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        key={idx}
                        className="border-2 border-slate-300 p-6 rounded-xl print:rounded-none print:break-inside-avoid print:mb-[10mm] print:border-black page-break-avoid relative bg-white shadow-sm print:shadow-none"
                    >
                        <div className="absolute top-4 right-4 text-sm font-bold text-slate-400 print:text-black border-2 border-slate-200 print:border-black px-3 py-1 rounded-md">
                            No. {String(idx + 1).padStart(3, '0')}
                        </div>
                        <div className="text-center space-y-4 mt-6">
                            <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-slate-200 print:border-black pb-3 mb-4 mx-4 truncate">
                                {ticket.teamName}
                            </h3>
                            <div>
                                <p className="text-sm text-slate-500 tracking-widest mb-1">{ticket.furigana}</p>
                                <p className="text-3xl sm:text-4xl font-black tracking-tight">{ticket.playerName}</p>
                            </div>
                            {ticket.wristband && (
                                <div className="mt-6 inline-block px-4 py-1.5 rounded-full border-2 border-slate-300 print:border-black text-sm font-bold bg-slate-50 print:bg-white text-slate-700 print:text-black">
                                    WB COLOR: <span className="uppercase">{ticket.wristband}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300 print:border-black flex items-center justify-between text-xs text-slate-400 print:text-black font-medium">
                            <span>vankycup</span>
                            <span>2026 Season</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page-break-avoid {
                        break-inside: avoid;
                    }
                    .print\\:block {
                        display: grid !important; 
                        grid-template-columns: 1fr 1fr; 
                        gap: 10mm;
                    }
                }
            `}</style>
        </div>
    );
}
