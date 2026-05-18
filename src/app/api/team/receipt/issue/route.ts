import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 領収書の宛名（receiptName）を保存し、発行日時を記録するAPI
export async function POST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id');
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }

        const { receiptName } = await request.json();

        // 既存エントリーを確認
        const existing = await db.teamEntry.findUnique({ where: { id: entryId } });
        if (!existing) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        // 支払い済みでなければ発行不可
        if (!existing.isPaid) {
            return NextResponse.json({ error: '参加費の支払いが確認されていません' }, { status: 403 });
        }

        // 既に発行済みの場合は宛名変更不可（発行済みの情報をそのまま返す）
        if (existing.receiptIssuedAt) {
            return NextResponse.json({
                success: true,
                alreadyIssued: true,
                receiptName: existing.receiptName,
                receiptIssuedAt: existing.receiptIssuedAt.toISOString()
            });
        }

        // 初回発行：宛名を保存し、発行日時を記録
        const updated = await db.teamEntry.update({
            where: { id: entryId },
            data: {
                receiptName: receiptName || null,
                receiptIssuedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            alreadyIssued: false,
            receiptName: updated.receiptName,
            receiptIssuedAt: updated.receiptIssuedAt?.toISOString()
        });

    } catch (e) {
        console.error('[API receipt/issue] Error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
