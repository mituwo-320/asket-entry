"use client";
import { AdminPrintGuide } from "@/components/admin/AdminFrame";

import { Suspense } from "react";
import TeamPrintView from "@/components/admin/TeamPrintView";
import { Loader2 } from "lucide-react";

export default function AdminPrintPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>}>
            <AdminPrintGuide title="チーム情報の印刷" description="対象のチームを確認してから、印刷・PDF保存へ進んでください。" /><div className="admin-documents"><TeamPrintView backUrl="/admin" /></div>
        </Suspense>
    );
}
