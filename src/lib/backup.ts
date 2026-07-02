import { db } from '@/lib/db';

/**
 * Backs up tournament entry data (team entries, players, and related users)
 * to the Backup table in the database.
 * @param tournamentId The ID of the tournament to backup
 * @returns The fileName of the saved backup, or null if failed / no data to back up
 */
export async function backupTournamentData(tournamentId: string): Promise<string | null> {
  try {
    console.log(`Starting backup for tournamentId: ${tournamentId}`);

    // 1. Fetch entries with players
    const entries = await db.teamEntry.findMany({
      where: { tournamentId },
      include: { players: true }
    });

    // 2. Fetch unique user IDs from entries
    const userIds = Array.from(new Set(entries.map(e => e.userId)));

    // 3. Fetch user details
    const users = userIds.length > 0 ? await db.user.findMany({
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

    // 4. Generate filename
    const formattedDate = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${tournamentId}_${formattedDate}.json`;

    // 5. Save backup to database
    await db.backup.create({
      data: {
        tournamentId,
        fileName,
        data: JSON.stringify(backupData)
      }
    });

    console.log(`Backup successfully saved to database: ${fileName}`);

    return fileName;
  } catch (error) {
    console.error('Failed to create backup in database:', error);
    return null;
  }
}
