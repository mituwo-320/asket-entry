import { NextResponse } from 'next/server';
import { saveTeamEntry, saveUser } from '@/lib/sheets';
import { TeamEntry, User, Player } from '@/lib/types';
import { sendAdminNotificationEmail, sendUserRegistrationEmail } from '@/lib/mail';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        let userId = "";
        let userName = body.representative;
        let userEmail = body.email;
        let userWristband = body.wristbandColor;
        const tournamentId = body.tournamentId;

        // --- Waitlist Logic ---
        // 1. プロジェクト情報を取得し、定員およびキャンセル待ち設定を確認する
        const project = await db.project.findUnique({ where: { id: body.tournamentId } });
        if (!project) {
            return NextResponse.json({ error: '指定された大会は見つかりませんでした' }, { status: 404 });
        }
        
        if (project.maxTeams) {
            const currentCount = await db.teamEntry.count({ where: { tournamentId: body.tournamentId } });
            if (currentCount >= project.maxTeams && project.isWaitlistEnabled === false) {
                return NextResponse.json({ error: 'この大会は定員に達しており、現在キャンセル待ちは受け付けていません。' }, { status: 400 });
            }
        }
        // ------------------------------------

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
            // Fetch project to get name, and calculate current count (we add 1 to current count to signify this new team)
            let projectName = body.tournamentId;
            let currentTeamCountStr = '';
            let isWaitlist = false;

            try {
                const p = await db.project.findUnique({ where: { id: body.tournamentId } });
                if (p) projectName = p.name;
                const count = await db.teamEntry.count({ where: { tournamentId: body.tournamentId } });
                if (p && p.maxTeams) {
                    currentTeamCountStr = `現在 ${count}チーム目 / 上限 ${p.maxTeams}チーム`;
                    if (count > p.maxTeams) {
                        isWaitlist = true;
                        currentTeamCountStr += " (キャンセル待ち)";
                    }
                } else {
                    currentTeamCountStr = `現在 ${count}チーム目`;
                }
            } catch (e) {
                console.error("Failed to fetch project details for email", e);
            }

            // 通知の完了を待機する（メール）
            try {
                const notifications = [
                    sendAdminNotificationEmail({
                        teamName: body.name,
                        representative: userName,
                        email: userEmail,
                        projectId: body.tournamentId,
                        projectName: projectName,
                        teamCountString: currentTeamCountStr
                    }),
                    sendUserRegistrationEmail({
                        teamName: body.name,
                        representative: userName,
                        email: userEmail,
                        projectName: projectName
                    })
                ];
                await Promise.all(notifications);
            } catch (notifyError) {
                console.error('Notification failed during registration:', notifyError);
            }

            return NextResponse.json({
                success: true,
                teamId: newEntry.id,
                isWaitlist: isWaitlist,
                user: {
                    id: userId,
                    email: userEmail,
                    name: userName,
                    phone: body.phone,
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

