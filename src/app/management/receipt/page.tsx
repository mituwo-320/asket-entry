"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { TeamEntry, User, Setting } from "@/lib/types";



function ReceiptContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const entryId = searchParams.get('id');

    const [teamEntry, setTeamEntry] = useState<TeamEntry & { projectName?: string } | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<Setting | any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!entryId) return;

        const fetchData = async () => {
            try {
                const [dataRes, settingsRes] = await Promise.all([
                    fetch('/api/team/data', { headers: { 'x-team-id': entryId } }),
                    fetch('/api/settings')
                ]);

                if (dataRes.ok) {
                    const data = await dataRes.json();
                    setTeamEntry(data.teamEntry);
                    setUser(data.user);
                }

                if (settingsRes.ok) {
                    setSettings(await settingsRes.json());
                }
            } catch (e) {
                console.error("Error fetching data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [entryId]);

    if (!entryId) return <div className="min-h-screen bg-white flex items-center justify-center">Invalid Entry ID</div>;
    if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    if (!teamEntry || !user) return <div className="min-h-screen bg-white flex items-center justify-center">Team Entry Not Found</div>;

    const participationFee = settings?.participationFee || 2500;
    const insuranceFee = settings?.insuranceFee || 150;
    const playerCount = teamEntry.players?.length || 0;
    const insuranceCount = teamEntry.players?.filter((p: any) => p.insurance).length || 0;
    const teamTotalFee = participationFee * playerCount;
    const insuranceTotalFee = insuranceFee * insuranceCount;
    const grandTotal = teamTotalFee + insuranceTotalFee;

    // 宛名
    const representativeName = teamEntry.players?.find((p: any) => p.isRepresentative)?.name || user.name;
    const addressee = teamEntry.receiptName || `${teamEntry.teamName} ${representativeName}`;

    // 発行日（令和表記）：ユーザーの発行日があればそれを使用、なければ今日
    const issueDate = teamEntry.receiptIssuedAt ? new Date(teamEntry.receiptIssuedAt) : new Date();
    const reiwaYear = issueDate.getFullYear() - 2018;
    const month = issueDate.getMonth() + 1;
    const day = issueDate.getDate();
    const issueDateStr = `令和${reiwaYear}年${month}月${day}日`;

    // PDFファイル名用の日付（YYYYMMDD形式）
    const dateForFileName = `${issueDate.getFullYear()}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const pdfFileName = `ヴァンキーカップ領収書_${addressee}_${dateForFileName}`.replace(/[\s　]+/g, '_');

    // ページタイトルをPDFファイル名として設定
    if (typeof document !== 'undefined') {
        document.title = pdfFileName;
    }

    // 金額（漢数字ではなく大字風表記）
    const amountStr = grandTotal.toLocaleString('ja-JP');

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900" style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', 'MS Mincho', serif" }}>
            {/* 非印刷 操作バー */}
            <div className="print:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-300 hover:text-white transition-colors font-sans"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    前の画面へ戻る
                </button>
                <button
                    onClick={() => {
                        document.title = pdfFileName;
                        window.print();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2 font-bold transition-colors shadow-lg font-sans"
                >
                    <Printer className="w-4 h-4" />
                    PDFとして保存・印刷
                </button>
            </div>

            {/* 印刷エリア（A4） */}
            <div className="w-full max-w-[210mm] mx-auto bg-white shadow-xl my-8 print:my-0 print:shadow-none"
                style={{ padding: '20mm 18mm', minHeight: '260mm' }}>

                {/* タイトル */}
                <h1 className="text-4xl font-bold tracking-[0.5em] text-center mb-8 print:mb-6"
                    style={{ letterSpacing: '0.5em' }}>
                    領　収　書
                </h1>

                {/* 発行日 */}
                <div className="text-right text-sm mb-10 print:mb-8">
                    <span className="mr-4">発行日</span>
                    <span className="font-bold text-base border-b border-slate-800 pb-0.5 pl-2 pr-4">{issueDateStr}</span>
                </div>

                {/* 宛名 */}
                <div className="mb-10 print:mb-8">
                    <div className="inline-flex items-baseline gap-3 border-b-2 border-slate-800 pb-1 min-w-[280px]">
                        <span className="text-xl font-bold">{addressee}　御中</span>
                    </div>
                </div>

                {/* 金額 */}
                <div className="text-center my-10 print:my-8">
                    <div className="inline-flex items-center gap-6">
                        <span className="text-2xl font-bold tracking-widest">金額</span>
                        <span className="text-3xl font-bold pb-1 px-4">
                            ¥{amountStr}（税込）
                        </span>
                    </div>
                    <div className="border-b-2 border-slate-800 mt-2"></div>
                </div>

                {/* 但し書き */}
                <div className="mt-10 print:mt-8 mb-2">
                    <p className="text-base">但し、ヴァンキーカップ参加費として</p>
                </div>


                <p className="text-sm mt-4 mb-16 print:mb-12">上記正に領収いたしました。</p>

                {/* 発行者情報 + 印鑑 */}
                <div className="flex justify-end mt-auto">
                    <div className="relative">
                        {/* 会社情報テキスト */}
                        <div className="text-right text-sm space-y-0.5 leading-relaxed pr-2">
                            <p className="text-base font-bold">株式会社タツヲノコプロ</p>
                            <p>代表取締役　細本龍男</p>
                            <p>登録番号　T2-1200-0121-2489</p>
                            <p>〒530-0016</p>
                            <p>大阪府大阪市北区中崎1丁目7番3号</p>
                            <p>TEL：070-8369-8316</p>
                            <p>MAIL：tatsuo0301@gmail.com</p>
                        </div>
                        {/* 電子印鑑：右端に絶対配置し、テキストに重なるように */}
                        <img
                            src="/hanko.png"
                            alt="印鑑"
                            width={80}
                            height={80}
                            style={{
                                position: 'absolute',
                                top: '0px',
                                right: '-50px',
                                display: 'block',
                                opacity: 0.92,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 印刷スタイル */}
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
                }
            `}</style>
        </div>
    );
}

export default function ReceiptPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <ReceiptContent />
        </Suspense>
    );
}
