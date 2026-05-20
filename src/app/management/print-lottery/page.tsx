"use client";

import { Suspense } from "react";
import LotteryTicketPrintView from "@/components/admin/LotteryTicketPrintView";
import { Loader2 } from "lucide-react";

export default function ManagementPrintLotteryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <LotteryTicketPrintView backUrl="/management" />
        </Suspense>
    );
}
