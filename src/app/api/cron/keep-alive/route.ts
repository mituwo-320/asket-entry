import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // データベースに軽量なクエリを実行してスリープを防ぐ
        await db.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: 'ok',
            message: 'Database keep-alive ping successful.',
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('Keep-alive ping failed:', e);
        return NextResponse.json({ error: 'Database keep-alive ping failed' }, { status: 500 });
    }
}
