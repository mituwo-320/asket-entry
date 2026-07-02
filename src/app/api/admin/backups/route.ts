import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { backupTournamentData } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbBackups = await db.backup.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const backups = dbBackups.map(b => ({
      fileName: b.fileName,
      tournamentId: b.tournamentId,
      createdAt: b.createdAt.toISOString(),
      size: Buffer.byteLength(b.data)
    }));

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    const fileName = await backupTournamentData(tournamentId);

    if (fileName) {
      return NextResponse.json({ success: true, message: 'バックアップを作成しました', fileName });
    } else {
      return NextResponse.json({ error: 'バックアップデータの作成に失敗しました。エントリーデータが1件もない可能性があります。' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
