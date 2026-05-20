"use client";

import { Suspense } from "react";
import AccountingPrintView from "@/components/admin/AccountingPrintView";
import { Loader2 } from "lucide-react";

export default function ManagementPrintAccountingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <AccountingPrintView backUrl="/management" />
        </Suspense>
    );
}
