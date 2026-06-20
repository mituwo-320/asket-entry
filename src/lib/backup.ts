import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Backs up tournament entry data (team entries, players, and related users)
 * to a local JSON file inside the backups/ directory.
 * @param tournamentId The ID of the tournament to backup
 * @returns The file path of the saved backup, or null if failed / no data to back up
 */
export async function backupTournamentData(tournamentId: string): Promise<string | null> {
  try {
    console.log(`Starting backup for tournamentId: ${tournamentId}`);

    // 1. Fetch entries with players
    const entries = await prisma.teamEntry.findMany({
      where: { tournamentId },
      include: { players: true }
    });

    // 2. Fetch unique user IDs from entries
    const userIds = Array.from(new Set(entries.map(e => e.userId)));

    // 3. Fetch user details
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        postalCode: true,
        address: true,
        wristbandColor: true,
        role: true
      }
    }) : [];

    const backupData = {
      timestamp: new Date().toISOString(),
      tournamentId,
      users,
      entries
    };

    // 4. Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 5. Save backup to JSON file
    const formattedDate = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${tournamentId}_${formattedDate}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`Backup successfully saved to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}
