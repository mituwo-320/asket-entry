import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeEqual } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || !safeEqual(request.headers.get("authorization") || "", `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        // データベースに軽量なクエリを実行してスリープを防ぐ
        await db.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: 'ok',
            message: 'Database keep-alive ping successful.',
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('Keep-alive ping failed:', e);
        return NextResponse.json({ error: 'Database keep-alive ping failed' }, { status: 500 });
    }
}
