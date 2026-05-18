import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 領収書を閲覧済みとしてマークするAPI（1回のみ、ユーザー向け）
export async function POST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id');
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }

        const existing = await db.teamEntry.findUnique({ where: { id: entryId } });
        if (!existing) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        // 既に閲覧済みの場合
        if (existing.receiptViewedAt) {
            return NextResponse.json({
                success: true,
                alreadyViewed: true,
                receiptViewedAt: existing.receiptViewedAt.toISOString()
            });
        }

        // 初回閲覧：日時を記録
        const updated = await db.teamEntry.update({
            where: { id: entryId },
            data: { receiptViewedAt: new Date() }
        });

        return NextResponse.json({
            success: true,
            alreadyViewed: false,
            receiptViewedAt: updated.receiptViewedAt?.toISOString()
        });

    } catch (e) {
        console.error('[API receipt/viewed] Error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
