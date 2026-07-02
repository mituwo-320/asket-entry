import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const teamId = request.headers.get('x-team-id');
        const { playerId } = await request.json();

        if (!teamId || !playerId) {
            return NextResponse.json({ success: false, error: 'Team ID or Player ID missing' }, { status: 400 });
        }

        // Find the team entry to check status
        const teamEntry = await db.teamEntry.findUnique({
            where: { id: teamId }
        });
        if (!teamEntry) {
            return NextResponse.json({ success: false, error: 'Team entry not found' }, { status: 404 });
        }

        const cookieStore = await cookies();
        const isAdmin = cookieStore.get('admin_auth')?.value === 'true';

        if (teamEntry.status === 'submitted' && !isAdmin) {
            return NextResponse.json({ success: false, error: '本エントリー完了後の編集はできません' }, { status: 403 });
        }

        // Find the player and verify it belongs to this team
        const player = await db.player.findUnique({
            where: { id: playerId }
        });

        if (!player) {
            return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
        }

        // Verify the player belongs to this team
        if (player.entryId !== teamId) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Prevent deleting the representative player
        if (player.isRepresentative) {
            return NextResponse.json({ success: false, error: '代表者は削除できません' }, { status: 400 });
        }

        // Delete the player directly from the Player table
        await db.player.delete({
            where: { id: playerId }
        });

        // Return updated player list
        const updatedPlayers = await db.player.findMany({
            where: { entryId: teamId },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json({ success: true, players: updatedPlayers });

    } catch (e) {
        console.error("Player Delete Error:", e);
        return NextResponse.json({ success: false, error: 'Failed to delete player' }, { status: 500 });
    }
}
