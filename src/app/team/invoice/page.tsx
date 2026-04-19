"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeamEntry, User, Setting } from "@/lib/types";

function InvoiceContent() {
    const searchParams = useSearchParams();
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
    const insuranceCount = teamEntry.players?.filter(p => p.insurance).length || 0;

    const teamTotalFee = participationFee * playerCount;
    const insuranceTotalFee = insuranceFee * insuranceCount;
    const grandTotal = teamTotalFee + insuranceTotalFee;

    const representativeName = teamEntry.players?.find(p => p.isRepresentative)?.name || user.name;

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            {/* Non-printable Top Bar */}
            <div className="print:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center text-slate-300 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    マイページへ戻る
                </Link>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.print()} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2 font-bold transition-colors shadow-lg"
                    >
                        <Printer className="w-4 h-4" />
                        PDFとして保存・印刷
                    </button>
                </div>
            </div>

            {/* Printable Area - A4 Size Simulation */}
            <div className="w-full max-w-[210mm] mx-auto bg-white p-8 sm:p-[20mm] min-h-[297mm] shadow-xl my-8 print:my-0 print:shadow-none print:p-0">
                
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-bold tracking-widest border-b-2 border-slate-800 pb-4 mb-4 inline-block px-8">請 求 書</h1>
                    <div className="text-right text-sm text-slate-500 mb-2">
                        発行日: {new Date().toLocaleDateString('ja-JP')}
                    </div>
                </div>

                <div className="flex justify-between mb-12">
                    {/* Addressee */}
                    <div className="text-lg">
                        <div className="font-bold text-xl mb-1 pb-1 border-b border-slate-400 inline-block min-w-[250px]">
                            {teamEntry.teamName} ・ {user.name} 様
                        </div>
                    </div>
                    {/* Issuer */}
                    <div className="text-sm space-y-1 text-right">
                        <p className="font-bold text-base">株式会社 タツヲノコプロ</p>
                        <p>代表取締役 細本龍男（たつを）</p>
                        <p>〒530-0016 大阪市北区中崎１丁目7番3号</p>
                        <p>電話 (070) 8369-8316</p>
                        <p>登録番号：T2-1200-0121-2489</p>
                    </div>
                </div>

                {/* Greeting */}
                <div className="mb-10 text-sm leading-relaxed">
                    <p className="mb-4">【ヴァンキーカップ】</p>
                    <p>この度はヴァンキーカップ {teamEntry.projectName || teamEntry.tournamentId} にご参加いただき、誠にありがとうございます。</p>
                    <p>下記の通り参加費を徴収させていただきます。お手数おかけしますが、お振込よろしくお願いします。</p>
                </div>

                {/* Calculation Details */}
                <div className="mb-10 border-t-2 border-b-2 border-slate-800 py-6">
                    <table className="w-full text-base mb-6">
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-3">参加費用（{participationFee.toLocaleString()}円）× {playerCount}人</td>
                                <td className="py-3 text-right">＝ {teamTotalFee.toLocaleString()} 円</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-3">保険加入料（{insuranceFee.toLocaleString()}円）× {insuranceCount}人</td>
                                <td className="py-3 text-right">＝ {insuranceTotalFee.toLocaleString()} 円</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="flex justify-between items-end">
                        <div className="text-xl font-bold tracking-widest">【 合計金額 】</div>
                        <div className="text-3xl font-bold border-b-2 border-slate-800 px-4 pb-1">
                            {grandTotal.toLocaleString()} 円 <span className="text-sm font-normal">（税込）</span>
                        </div>
                    </div>
                </div>

                {/* Payment Info */}
                <div className="mb-12 bg-slate-50 p-6 rounded border border-slate-200 text-sm leading-relaxed space-y-4">
                    <div>
                        <span className="font-bold mr-2 text-base">■ お支払い期日:</span> 
                        {/* Currently hardcoded based on user request, could be made dynamic if needed */}
                        <span className="font-bold text-base text-red-600">5月25日（月）まで</span>
                    </div>
                    
                    <div>
                        <span className="font-bold block text-base mb-2">■ お振込先</span>
                        <div className="pl-4 font-bold text-base space-y-1">
                            <p>三菱ＵＦＪ銀行 鶴橋支店</p>
                            <p>普通 ００９２１１４</p>
                            <p>株式会社 タツヲノコプロ</p>
                        </div>
                    </div>

                    <div className="text-slate-600 pt-4 space-y-1">
                        <p>※ お振込名義は「<span className="font-bold text-slate-800">{representativeName}</span>」でお願いいたします。</p>
                        <p>※ エントリー以降の参加者キャンセルによる返金は行いません。</p>
                        <p>※ 恐れ入りますが振込手数料はご負担ください。</p>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="mt-16 pt-8 border-t border-slate-200 text-sm leading-relaxed text-center">
                    <p>バスケを通して、仲間を増やしてもらえたら嬉しいし、楽しい時間を過ごしましょう！</p>
                    <p>会場に居る人、全ての人に景品が当たるチャンスがあるので、見学・応援大歓迎です♪</p>
                    <p>一緒に最高の1日にしましょうね。よろしくお願いします。</p>
                </div>
            </div>
            
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
            `}</style>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <InvoiceContent />
        </Suspense>
    );
}
