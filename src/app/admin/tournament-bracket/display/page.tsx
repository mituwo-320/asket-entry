"use client";
import { staffFetch } from "@/lib/staff-fetch";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useBrowserPreference } from "@/lib/browser-preference";
import { AdminState } from "@/components/admin/AdminFrame";
import { TournamentBracketData, TeamEntry } from "@/lib/types";
import BracketFullscreen from "@/components/admin/BracketFullscreen";
import { Trophy, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface DisplayData {
    bracketId: string;
    brackets: TournamentBracketData;
    entries: TeamEntry[];
}

/**
 * /admin/tournament-bracket/display
 * 
 * Read-only fullscreen display page intended for projectors / monitors.
 * Polls the server every 5 seconds to reflect admin changes in real time.
 * No win buttons are shown (readOnly=true).
 */
function BracketDisplayContent() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<DisplayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const tournamentId = searchParams.get('id') || '2024-Spring';
    const [savedTheme] = useBrowserPreference('tournament-bracket-theme', 'light');
    const theme = savedTheme === 'dark' ? 'dark' : 'light';

    const fetchData = useCallback(() => {
        if (!tournamentId) return;
        return staffFetch(`/api/admin/bracket?tournamentId=${tournamentId}`).then(async (bracketRes) => {
            if (!bracketRes.ok) throw new Error('Failed to fetch bracket');
            const bracketJson = await bracketRes.json();

            if (!bracketJson.bracket) {
                setIsLoading(false);
                return;
            }

            // Fetch entries
            const dataRes = await staffFetch('/api/admin/data');
            const dataJson = await dataRes.json();

            setData({
                bracketId: bracketJson.bracket.id,
                brackets: bracketJson.bracket.brackets as TournamentBracketData,
                entries: (dataJson.entries || []).filter(
                    (e: TeamEntry) => e.tournamentId === tournamentId
                ),
            });
            setIsConnected(true);
            setLastUpdated(new Date());
        }).catch(() => {
            setIsConnected(false);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [tournamentId]);

    // Initial + polling
    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 5000);
        return () => clearInterval(id);
    }, [fetchData]);

    if (isLoading) {
        return <AdminState loading title="表示用の対戦表に接続しています" />;
    }

    if (!data) {
        return (
            <div className={`admin-display-empty min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'} flex flex-col items-center justify-center gap-6 text-center px-8`}>
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <Trophy className={`w-16 h-16 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} mx-auto mb-4`} />
                    <h2 className="text-xl font-black mb-2">トーナメント表がありません</h2>
                    <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-450'} text-sm`}>管理画面でトーナメント表を作成してください</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    再読み込み
                </button>
            </div>
        );
    }

    return (
        <div className={`relative min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
            {/* Status indicator (top-right corner, very subtle, matching background) */}
            <div className="admin-display-connection fixed bottom-3 right-4 z-[210] flex items-center gap-2">
                {isConnected ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-650'} font-mono`}>
                    {lastUpdated ? lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                </span>
            </div>

            {/* Bracket always open in display mode */}
            <BracketFullscreen
                appearance="admin"
                isOpen={true}
                onClose={() => {}}   // no-op — can't close display mode
                bracketData={data.brackets}
                entries={data.entries}
                onWin={() => {}}     // no-op — read-only
                readOnly={true}
            />
        </div>
    );
}

export default function BracketDisplayPage() {
    return <Suspense fallback={<AdminState loading title="表示用の対戦表に接続しています" />}><BracketDisplayContent /></Suspense>;
}
