import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuthorization } from '@/lib/auth/authorize';
import { readSession } from '@/lib/auth/session';
import { findTeamEntry, findUserById, getProjects } from '@/lib/sheets';
import type { TeamEntry, Player, User } from '@/lib/types';

async function handlePOST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id');
        if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '入力内容が不正です' }, { status: 400 });
        const existingEntry = await findTeamEntry(entryId);
        if (!existingEntry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        const isAdmin = readSession(request.headers.get('cookie'))?.role === 'admin';
        if (existingEntry.status === 'submitted' && !isAdmin && Object.keys(body).some(key => !['clinicParticipation', 'clinicCount'].includes(key))) {
            return NextResponse.json({ error: '本エントリー完了後の編集はできません' }, { status: 403 });
        }
        const project = (await getProjects()).find(p => p.id === existingEntry.tournamentId);
        if (project?.entryEndDate && new Date() > new Date(project.entryEndDate) && !isAdmin) return NextResponse.json({ error: 'この大会のエントリー期間は終了しました' }, { status: 403 });
        const user = await findUserById(existingEntry.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        for (const key of ['teamName', 'teamNameKana', 'teamIntroduction', 'representativeName', 'repFurigana', 'wristbandColor', 'phone']) {
            if (body[key] !== undefined && typeof body[key] !== 'string') return NextResponse.json({ error: '入力内容が不正です' }, { status: 400 });
        }
        if ((body.insurance !== undefined && typeof body.insurance !== 'boolean') || (body.clinicParticipation !== undefined && body.clinicParticipation !== null && typeof body.clinicParticipation !== 'boolean')) return NextResponse.json({ error: '入力内容が不正です' }, { status: 400 });
        const clinicCount = body.clinicCount !== undefined ? Number(body.clinicCount || 0) : undefined;
        if (clinicCount !== undefined && (!Number.isInteger(clinicCount) || clinicCount < 0 || (project?.hasClinic && clinicCount > (project.clinicLimit ?? 20)))) return NextResponse.json({ error: 'クリニックの人数が不正です' }, { status: 400 });

        const entryChanges: Partial<Pick<TeamEntry, 'teamName' | 'teamNameKana' | 'teamIntroduction' | 'clinicParticipation' | 'clinicCount'>> = {};
        for (const key of ['teamName', 'teamNameKana', 'teamIntroduction', 'clinicParticipation'] as const) if (body[key] !== undefined) entryChanges[key] = body[key];
        if (clinicCount !== undefined) entryChanges.clinicCount = clinicCount;
        const representativeChanges: Partial<Pick<Player, 'name' | 'furigana' | 'wristbandColor' | 'insurance'>> = {};
        if (body.representativeName !== undefined) representativeChanges.name = body.representativeName;
        if (body.repFurigana !== undefined) representativeChanges.furigana = body.repFurigana;
        if (body.wristbandColor !== undefined) representativeChanges.wristbandColor = body.wristbandColor;
        if (body.insurance !== undefined) representativeChanges.insurance = body.insurance;
        const userChanges: Partial<Pick<User, 'name' | 'phone' | 'wristbandColor'>> = {};
        if (body.representativeName !== undefined) userChanges.name = body.representativeName;
        if (body.phone !== undefined) userChanges.phone = body.phone;
        if (body.wristbandColor !== undefined) userChanges.wristbandColor = body.wristbandColor;
        const representative = existingEntry.players.find(p => p.isRepresentative) || existingEntry.players[0];

        // Save only participant-editable fields. A stale snapshot must not overwrite staff payment/receipt/status changes.
        await db.$transaction(async tx => {
            if (Object.keys(entryChanges).length) await tx.teamEntry.update({ where: { id: entryId }, data: entryChanges });
            if (representative && Object.keys(representativeChanges).length) await tx.player.update({ where: { id: representative.id, entryId }, data: representativeChanges });
            if (Object.keys(userChanges).length) await tx.user.update({ where: { id: user.id }, data: userChanges });
        });
        return NextResponse.json({ success: true, teamEntry: { ...existingEntry, ...entryChanges, players: existingEntry.players.map(p => p.id === representative?.id ? { ...p, ...representativeChanges } : p) }, user: { ...user, ...userChanges } });
    } catch {
        console.error('Team profile update failed');
        return NextResponse.json({ error: '保存に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
    }
}
export const POST = withAuthorization(handlePOST, { roles: ['admin', 'user'], entry: true });
