"use client";

import { Suspense } from "react";
import TeamPrintView from "@/components/admin/TeamPrintView";
import { Loader2 } from "lucide-react";

export default function AdminPrintPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <TeamPrintView backUrl="/admin" />
        </Suspense>
    );
}
