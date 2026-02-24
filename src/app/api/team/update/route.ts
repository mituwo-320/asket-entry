import { NextResponse } from 'next/server';
import { findTeamEntry, saveTeamEntry, findUserById, saveUser, getSetting } from '@/lib/sheets';
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

        const setting = await getSetting();
        if (setting?.entryDeadline && new Date() > new Date(setting.entryDeadline)) {
            return NextResponse.json({ error: 'エントリー期間は終了しました' }, { status: 403 });
        }

        const user = await findUserById(existingEntry.userId);
        if (!user) {
            console.error(`[API Update] User not found: ${existingEntry.userId}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Update Team Entry (Team Name, Kana, Intro)
        const updatedEntry: TeamEntry = {
            ...existingEntry,
            teamName: body.teamName,
            teamNameKana: body.teamNameKana,
            teamIntroduction: body.teamIntroduction,
        };

        // 3. Update Representative Player (Name, Furigana, Wristband, Insurance)
        // Find the representative player
        const repIndex = updatedEntry.players.findIndex(p => p.isRepresentative);
        if (repIndex >= 0) {
            updatedEntry.players[repIndex] = {
                ...updatedEntry.players[repIndex],
                name: body.representativeName,
                furigana: body.repFurigana,
                wristbandColor: body.wristbandColor,
                insurance: body.insurance,
            };
        } else {
            // Fallback: update first player if no rep tag found
            if (updatedEntry.players.length > 0) {
                updatedEntry.players[0] = {
                    ...updatedEntry.players[0],
                    name: body.representativeName,
                    furigana: body.repFurigana,
                    wristbandColor: body.wristbandColor,
                    insurance: body.insurance,
                };
            }
        }

        // 4. Update User Profile (Name, Phone, Address, PostalCode)
        const updatedUser: User = {
            ...user,
            name: body.representativeName, // Sync user name with rep name
            phone: body.phone,
            wristbandColor: body.wristbandColor, // Sync preference
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
