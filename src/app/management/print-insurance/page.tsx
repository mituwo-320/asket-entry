"use client";

import { OperationsPrintGuide } from "@/components/operations/OperationsFrame";
import { Suspense } from "react";
import InsurancePrintView from "@/components/admin/InsurancePrintView";
import { Loader2 } from "lucide-react";

export default function ManagementPrintInsurancePage() {
    return (
        <div className="operations-documents"><OperationsPrintGuide title="保険加入者リスト" description="対象の大会と内容を確認し、下の操作バーからPDF保存または印刷へ進んでください。" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <InsurancePrintView backUrl="/management" />
        </Suspense></div>
    );
}
