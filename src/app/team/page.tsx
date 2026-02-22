"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeamPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push("/login");
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
            Redirecting to Login...
        </div>
    );
}
