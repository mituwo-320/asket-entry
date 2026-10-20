"use client";

import { OperationsPrintGuide } from "@/components/operations/OperationsFrame";
import { Suspense } from "react";
import LotteryTicketPrintView from "@/components/admin/LotteryTicketPrintView";
import { Loader2 } from "lucide-react";

export default function ManagementPrintLotteryPage() {
    return (
        <div className="operations-documents"><OperationsPrintGuide title="予選の抽選券" description="対象の大会と内容を確認し、下の操作バーからPDF保存または印刷へ進んでください。" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <LotteryTicketPrintView backUrl="/management" />
        </Suspense></div>
    );
}
