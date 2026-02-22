import { NextResponse } from 'next/server';
import { saveTeamEntry, saveUser } from '@/lib/sheets';
import { TeamEntry, User, Player } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Create User
        const newUser: User = {
            id: "u_" + uuidv4(),
            email: body.email,
            password: body.password, // plain text, sheets.ts will hash it
            name: body.representative, // Form sends 'representative'
            phone: body.phone,
            postalCode: body.postalCode,
            address: body.address,
            wristbandColor: body.wristbandColor
        };

        let userSaved = false;
        try {
            userSaved = await saveUser(newUser);
        } catch (dbError: any) {
            console.error('saveUser dbError:', dbError);
            return NextResponse.json({ error: `DB Error: ${dbError.message || String(dbError)}` }, { status: 500 });
        }

        if (!userSaved) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        // 2. Create Initial Team Entry with Rep as 1st Player
        const repPlayer: Player = {
            id: "p_" + uuidv4(),
            name: newUser.name,
            furigana: body.furigana || "", // NEW: Rep registration now asks for furigana
            insurance: body.insurance || false, // NEW: Rep registration now asks for insurance
            wristbandColor: newUser.wristbandColor,
            isRepresentative: true
        };

        const newEntry: TeamEntry = {
            id: "e_" + uuidv4(),
            userId: newUser.id, // Link to the REAL new user
            tournamentId: "2024-Spring",
            teamName: body.name, // Form sends 'name' for team name
            teamNameKana: body.teamNameKana || "", // NEW
            teamIntroduction: body.teamIntroduction || "", // NEW
            isBeginnerFriendlyAccepted: body.isBeginnerFriendlyAccepted || false, // NEW
            players: [repPlayer], // Add Rep immediately
            status: 'draft',
            createdAt: new Date().toISOString()
        };

        const success = await saveTeamEntry(newEntry);

        if (success) {
            return NextResponse.json({ success: true, teamId: newEntry.id });
        } else {
            return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

