import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { backupTournamentData } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] });
    }

    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => {
        const stats = fs.statSync(path.join(backupsDir, file));
        
        // File pattern: backup_[tournamentId]_[timestamp].json
        const parts = file.replace('backup_', '').replace('.json', '').split('_');
        const tournamentId = parts[0] || 'unknown';
        
        let date: Date;
        try {
          let cleanTimestamp = parts[1] || '';
          if (cleanTimestamp) {
            // Restore ISO formatting (e.g. 2026-06-19T15-11-17-860Z -> 2026-06-19T15:11:17.860Z)
            const tIndex = cleanTimestamp.indexOf('T');
            if (tIndex !== -1) {
              const datePart = cleanTimestamp.substring(0, tIndex);
              let timePart = cleanTimestamp.substring(tIndex + 1);
              timePart = timePart.replace('-', ':').replace('-', ':'); // colons for hh:mm:ss
              timePart = timePart.replace('-', '.'); // dot for ms
              cleanTimestamp = `${datePart}T${timePart}`;
            }
          }
          date = new Date(cleanTimestamp);
          if (isNaN(date.getTime())) {
            date = stats.mtime;
          }
        } catch {
          date = stats.mtime;
        }

        return {
          fileName: file,
          tournamentId,
          createdAt: date.toISOString(),
          size: stats.size
        };
      })
      // Sort by newest first
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    const filePath = await backupTournamentData(tournamentId);

    if (filePath) {
      const fileName = path.basename(filePath);
      return NextResponse.json({ success: true, message: 'バックアップを作成しました', fileName });
    } else {
      return NextResponse.json({ error: 'バックアップデータの作成に失敗しました。エントリーデータが1件もない可能性があります。' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
