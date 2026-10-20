import { withAuthorization } from '@/lib/auth/authorize';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function handlePOST(request: Request) {
  try {
    const entryId = request.headers.get('x-team-id');
    if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    const result = await db.teamEntry.updateMany({ where: { id: entryId, isPaid: true, receiptIssuedAt: { not: null }, receiptViewedAt: null }, data: { receiptViewedAt: new Date() } });
    const entry = await db.teamEntry.findUnique({ where: { id: entryId } });
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    if (!entry.isPaid || !entry.receiptIssuedAt) return NextResponse.json({ error: '発行済みの領収書を確認できません' }, { status: 403 });
    return NextResponse.json({ success: true, alreadyViewed: result.count === 0, receiptViewedAt: entry.receiptViewedAt?.toISOString() });
  } catch { return NextResponse.json({ error: '領収書の閲覧を記録できませんでした' }, { status: 500 }); }
}
export const POST = withAuthorization(handlePOST, { roles: ['admin', 'user'], entry: true });
