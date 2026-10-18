import { withAuthorization } from '@/lib/auth/authorize';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function handlePOST(request: Request) {
  try {
    const entryId = request.headers.get('x-team-id');
    if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    const { receiptName } = await request.json();
    const result = await db.teamEntry.updateMany({
      where: { id: entryId, isPaid: true, receiptIssuedAt: null },
      data: { receiptName: typeof receiptName === 'string' && receiptName ? receiptName : null, receiptIssuedAt: new Date() },
    });
    const entry = await db.teamEntry.findUnique({ where: { id: entryId } });
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    if (!entry.isPaid) return NextResponse.json({ error: '参加費の支払いが確認されていません' }, { status: 403 });
    return NextResponse.json({ success: true, alreadyIssued: result.count === 0, receiptName: entry.receiptName, receiptIssuedAt: entry.receiptIssuedAt?.toISOString() });
  } catch {
    return NextResponse.json({ error: '領収書を発行できませんでした' }, { status: 500 });
  }
}
export const POST = withAuthorization(handlePOST, { roles: ['admin', 'user'], entry: true });
