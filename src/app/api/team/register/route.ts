import { NextResponse } from 'next/server';
import { saveTeamEntry, saveUser } from '@/lib/sheets';
import { TeamEntry, User, Player } from '@/lib/types';
import { sendAdminNotificationEmail } from '@/lib/mail';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        let userId = "";
        let userName = body.representative;
        let userEmail = body.email;
        let userWristband = body.wristbandColor;

        if (body.existingUserId) {
            userId = body.existingUserId;
        } else {
            // 1. Create User
            const newUser: User = {
                id: "u_" + uuidv4(),
                email: body.email,
                password: body.password, // plain text, sheets.ts will hash it
                name: body.representative, // Form sends 'representative'
                phone: body.phone,
                wristbandColor: body.wristbandColor
            };

            let userSaved = false;
            try {
                userSaved = await saveUser(newUser);
            } catch (dbError: any) {
                console.error('saveUser dbError:', dbError);
                return NextResponse.json({ error: `データベースの保存に失敗しました。時間をおいて再度お試しください。(${dbError.message || String(dbError)})` }, { status: 500 });
            }

            if (!userSaved) {
                return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
            }
            userId = newUser.id;
        }

        // 2. Create Initial Team Entry with Rep as 1st Player
        const repPlayer: Player = {
            id: "p_" + uuidv4(),
            name: userName,
            furigana: body.furigana || "", // NEW: Rep registration now asks for furigana
            insurance: body.insurance || false, // NEW: Rep registration now asks for insurance
            wristbandColor: userWristband,
            isRepresentative: true
        };

        const newEntry: TeamEntry = {
            id: "e_" + uuidv4(),
            userId: userId, // Link to the REAL new or existing user
            tournamentId: body.tournamentId, // NEW
            teamName: body.name, // Form sends 'name' for team name
            teamNameKana: body.teamNameKana || "", // NEW
            teamIntroduction: body.teamIntroduction || "", // NEW
            isBeginnerFriendlyAccepted: body.isBeginnerFriendlyAccepted || false, // NEW
            players: [repPlayer], // Add Rep immediately
            status: 'draft',
            preliminaryNumber: body.preliminaryNumber ? parseInt(body.preliminaryNumber, 10) : undefined, // NEW
            createdAt: new Date().toISOString()
        };

        const success = await saveTeamEntry(newEntry);

        if (success) {
            // Trigger admin notification email asynchronously (do not await to speed up response)
            sendAdminNotificationEmail({
                teamName: body.name,
                representative: userName,
                email: userEmail,
                projectId: body.tournamentId,
            }).catch(console.error);

            return NextResponse.json({
                success: true,
                teamId: newEntry.id,
                user: {
                    id: userId,
                    email: userEmail,
                    name: userName,
                    furigana: body.furigana || "",
                    role: 'user'
                }
            });
        } else {
            return NextResponse.json({ error: 'チームの登録に失敗しました' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

