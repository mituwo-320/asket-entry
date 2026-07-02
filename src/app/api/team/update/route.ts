import { NextResponse } from 'next/server';
import { findTeamEntry, saveTeamEntry, findUserById, saveUser, getSetting, getProjects } from '@/lib/sheets';
import { TeamEntry, User } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id');
        console.log(`[API Update] request for entryId: ${entryId}`);
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }

        const body = await request.json();
        console.log('[API Update] Payload:', JSON.stringify(body, null, 2));

        // 1. Fetch existing data to verify and merge
        const existingEntry = await findTeamEntry(entryId);
        if (!existingEntry) {
            console.error(`[API Update] Entry not found: ${entryId}`);
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        if (existingEntry.status === 'submitted') {
            return NextResponse.json({ error: '本エントリー完了後の編集はできません' }, { status: 403 });
        }

        const projects = await getProjects();
        const project = projects.find(p => p.id === existingEntry.tournamentId);
        if (project?.entryEndDate && new Date() > new Date(project.entryEndDate)) {
            return NextResponse.json({ error: 'この大会のエントリー期間は終了しました' }, { status: 403 });
        }

        const user = await findUserById(existingEntry.userId);
        if (!user) {
            console.error(`[API Update] User not found: ${existingEntry.userId}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Update Team Entry (Team Name, Kana, Intro)
        const updatedEntry: TeamEntry = {
            ...existingEntry,
            teamName: body.teamName !== undefined ? body.teamName : existingEntry.teamName,
            teamNameKana: body.teamNameKana !== undefined ? body.teamNameKana : existingEntry.teamNameKana,
            teamIntroduction: body.teamIntroduction !== undefined ? body.teamIntroduction : existingEntry.teamIntroduction,
            clinicParticipation: body.clinicParticipation !== undefined ? body.clinicParticipation : existingEntry.clinicParticipation,
            clinicCount: body.clinicCount !== undefined ? (body.clinicCount ? parseInt(body.clinicCount.toString(), 10) : 0) : existingEntry.clinicCount,
        };

        // 3. Update Representative Player
        const repIndex = updatedEntry.players.findIndex(p => p.isRepresentative);
        const playerIndexToUpdate = repIndex >= 0 ? repIndex : 0;
        
        if (updatedEntry.players.length > 0) {
            updatedEntry.players[playerIndexToUpdate] = {
                ...updatedEntry.players[playerIndexToUpdate],
                name: body.representativeName !== undefined ? body.representativeName : updatedEntry.players[playerIndexToUpdate].name,
                furigana: body.repFurigana !== undefined ? body.repFurigana : updatedEntry.players[playerIndexToUpdate].furigana,
                wristbandColor: body.wristbandColor !== undefined ? body.wristbandColor : updatedEntry.players[playerIndexToUpdate].wristbandColor,
                insurance: body.insurance !== undefined ? body.insurance : updatedEntry.players[playerIndexToUpdate].insurance,
            };
        }

        // 4. Update User Profile
        const updatedUser: User = {
            ...user,
            name: body.representativeName !== undefined ? body.representativeName : user.name,
            phone: body.phone !== undefined ? body.phone : user.phone,
            wristbandColor: body.wristbandColor !== undefined ? body.wristbandColor : user.wristbandColor,
        };

        console.log('[API Update] Saving updates...');
        // Save both
        const entrySuccess = await saveTeamEntry(updatedEntry);
        const userSuccess = await saveUser(updatedUser);

        if (entrySuccess && userSuccess) {
            console.log('[API Update] Success');
            return NextResponse.json({ success: true, teamEntry: updatedEntry, user: updatedUser });
        } else {
            console.error('[API Update] Failed to save');
            return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
        }

    } catch (e) {
        console.error('[API Update] Server error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
