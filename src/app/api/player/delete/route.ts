import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findTeamEntry } from '@/lib/sheets';
import { Player } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const teamId = request.headers.get('x-team-id');
        const { playerId } = await request.json();

        if (!teamId || !playerId) {
            return NextResponse.json({ success: false, error: 'Team ID or Player ID missing' }, { status: 400 });
        }

        // Fetch current entry
        const entry = await findTeamEntry(teamId);
        if (!entry) {
            return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
        }

        // Prevent deleting the representative player (if you want to enforce this, currently any player could be marked representative)
        const playerToDelete = entry.players.find((p: Player) => p.id === playerId);
        if (playerToDelete?.isRepresentative) {
            return NextResponse.json({ success: false, error: '代表者は削除できません' }, { status: 400 });
        }

        // Filter out the player
        const updatedPlayers = entry.players.filter((p: Player) => p.id !== playerId);

        // Update database
        await db.teamEntry.update({
            where: { id: teamId },
            data: { players: updatedPlayers }
        });

        return NextResponse.json({ success: true, players: updatedPlayers });

    } catch (e) {
        console.error("Player Delete Error:", e);
        return NextResponse.json({ success: false, error: 'Failed to delete player' }, { status: 500 });
    }
}
