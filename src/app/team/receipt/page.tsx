"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Printer, ArrowLeft, AlertTriangle } from "lucide-react";
import { TeamEntry, User, Setting } from "@/lib/types";

function ReceiptContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const entryId = searchParams.get('id');

    const [teamEntry, setTeamEntry] = useState<TeamEntry & { projectName?: string } | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<Setting | any>(null);
    const [isLoading, setIsLoading] = useState(true);
    // 閲覧状態管理
    const [viewState, setViewState] = useState<'loading' | 'already_viewed' | 'viewing' | 'not_issued'>('loading');

    useEffect(() => {
        if (!entryId) return;

        const fetchAndMark = async () => {
            try {
                const [dataRes, settingsRes] = await Promise.all([
                    fetch('/api/team/data', { headers: { 'x-team-id': entryId } }),
                    fetch('/api/settings')
                ]);

                if (dataRes.ok) {
                    const data = await dataRes.json();
                    const entry = data.teamEntry as TeamEntry;
                    setTeamEntry(data.teamEntry);
                    setUser(data.user);

                    if (settingsRes.ok) setSettings(await settingsRes.json());

                    // 発行されていない場合
                    if (!entry.isPaid || !entry.receiptIssuedAt) {
                        setViewState('not_issued');
                        setIsLoading(false);
                        return;
                    }

                    // 既に閲覧済みの場合（閲覧日時が記録されている）
                    if (entry.receiptViewedAt) {
                        setViewState('already_viewed');
                        setIsLoading(false);
                        return;
                    }

                    // 初回閲覧：閲覧済みとしてマーク
                    const viewRes = await fetch('/api/team/receipt/viewed', {
                        method: 'POST',
                        headers: { 'x-team-id': entryId }
                    });
                    if (viewRes.ok) {
                        setViewState('viewing');
                    } else {
                        setViewState('not_issued');
                    }
                }
            } catch (e) {
                console.error("Error:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndMark();
    }, [entryId]);

    if (!entryId) return <AlreadyViewedBlock message="IDが無効です。" />;
    if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    if (viewState === 'not_issued') return <AlreadyViewedBlock message="領収書がまだ発行されていません。" />;
    if (viewState === 'already_viewed') return <AlreadyViewedBlock message="この領収書は既に確認済みです。再表示はできません。" showContactNote />;
    if (!teamEntry || !user) return <AlreadyViewedBlock message="データが見つかりませんでした。" />;

    // ---- 以下、初回閲覧時のみ表示 ----
    const participationFee = settings?.participationFee || 2500;
    const insuranceFee = settings?.insuranceFee || 150;
    const playerCount = teamEntry.players?.length || 0;
    const insuranceCount = teamEntry.players?.filter((p: any) => p.insurance).length || 0;
    const teamTotalFee = participationFee * playerCount;
    const insuranceTotalFee = insuranceFee * insuranceCount;
    const grandTotal = teamTotalFee + insuranceTotalFee;

    const representativeName = teamEntry.players?.find((p: any) => p.isRepresentative)?.name || user.name;
    const addressee = teamEntry.receiptName || `${teamEntry.teamName} ${representativeName}`;

    const issueDate = new Date(teamEntry.receiptIssuedAt!);
    const reiwaYear = issueDate.getFullYear() - 2018;
    const month = issueDate.getMonth() + 1;
    const day = issueDate.getDate();
    const issueDateStr = `令和${reiwaYear}年${month}月${day}日`;

    const dateForFileName = `${issueDate.getFullYear()}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const pdfFileName = `ヴァンキーカップ領収書_${addressee}_${dateForFileName}`.replace(/[\s　]+/g, '_');

    if (typeof document !== 'undefined') document.title = pdfFileName;

    const amountStr = grandTotal.toLocaleString('ja-JP');

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900" style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', 'MS Mincho', serif" }}>

            {/* ⚠️ 1回限り警告バナー（非印刷） */}
            <div className="print:hidden bg-red-700 text-white px-4 py-3 text-center text-sm font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                    ⚠️ この画面は<span className="underline">1度しか表示されません</span>。必ず今すぐPDF保存または印刷してください。閉じると再表示できなくなります。
                </span>
            </div>

            {/* 操作バー（非印刷） */}
            <div className="print:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-300 hover:text-white transition-colors font-sans"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    前の画面へ戻る
                </button>
                <button
                    onClick={() => { document.title = pdfFileName; window.print(); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2 font-bold transition-colors shadow-lg font-sans"
                >
                    <Printer className="w-4 h-4" />
                    PDFとして保存・印刷
                </button>
            </div>

            {/* 印刷エリア（A4） */}
            <div className="w-full max-w-[210mm] mx-auto bg-white shadow-xl my-8 print:my-0 print:shadow-none"
                style={{ padding: '20mm 18mm', minHeight: '260mm' }}>

                <h1 className="text-4xl font-bold tracking-[0.5em] text-center mb-8 print:mb-6" style={{ letterSpacing: '0.5em' }}>
                    領　収　書
                </h1>

                <div className="text-right text-sm mb-10 print:mb-8">
                    <span className="mr-4">発行日</span>
                    <span className="font-bold text-base border-b border-slate-800 pb-0.5 pl-2 pr-4">{issueDateStr}</span>
                </div>

                <div className="mb-10 print:mb-8">
                    <div className="inline-flex items-baseline gap-3 border-b-2 border-slate-800 pb-1 min-w-[280px]">
                        <span className="text-xl font-bold">{addressee}　御中</span>
                    </div>
                </div>

                <div className="text-center my-10 print:my-8">
                    <div className="inline-flex items-center gap-6">
                        <span className="text-2xl font-bold tracking-widest">金額</span>
                        <span className="text-3xl font-bold pb-1 px-4">¥{amountStr}（税込）</span>
                    </div>
                    <div className="border-b-2 border-slate-800 mt-2"></div>
                </div>

                <div className="mt-10 print:mt-8 mb-2">
                    <p className="text-base">但し、ヴァンキーカップ参加費として</p>
                </div>

                <p className="text-sm mt-4 mb-16 print:mb-12">上記正に領収いたしました。</p>

                <div className="flex justify-end mt-auto">
                    <div className="relative">
                        <div className="text-right text-sm space-y-0.5 leading-relaxed pr-2">
                            <p className="text-base font-bold">株式会社タツヲノコプロ</p>
                            <p>代表取締役　細本龍男</p>
                            <p>登録番号　T2-1200-0121-2489</p>
                            <p>〒530-0016</p>
                            <p>大阪府大阪市北区中崎1丁目7番3号</p>
                            <p>TEL：070-8369-8316</p>
                            <p>MAIL：tatsuo0301@gmail.com</p>
                        </div>
                        <img src="/hanko.png" alt="印鑑" width={80} height={80}
                            style={{ position: 'absolute', top: '0px', right: '-50px', display: 'block', opacity: 0.92 }} />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
                    @page { size: A4 portrait; margin: 0; }
                }
            `}</style>
        </div>
    );
}

// 閲覧済み・未発行の場合に表示するブロック
function AlreadyViewedBlock({ message, showContactNote }: { message: string; showContactNote?: boolean }) {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full space-y-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mx-auto">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">表示できません</h2>
                <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
                {showContactNote && (
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-700 pt-4">
                        領収書の再発行が必要な場合は、<br />
                        運営（tatsuo0301@gmail.com）までお問い合わせください。
                    </p>
                )}
                <button
                    onClick={() => router.back()}
                    className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    前の画面に戻る
                </button>
            </div>
        </div>
    );
}

export default function TeamReceiptPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <ReceiptContent />
        </Suspense>
    );
}
