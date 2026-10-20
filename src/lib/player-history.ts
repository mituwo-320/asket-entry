import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import type { Session } from './auth/session';
import type { Player } from './types';
import { MAX_HISTORY_IMPORT, playerIdentity, type HistoryTeam, type PlayerImportDraft } from './player-history-types';

export class PlayerHistoryError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
const playerSelect = { id: true, name: true, furigana: true, insurance: true, wristbandColor: true } as const;
const copiedId = (entryId: string, sourceId: string) => 'p_import_' + createHash('sha256').update(JSON.stringify([entryId, sourceId])).digest('hex');
function ownsEntry(userId: string, session: Session | null) {
    if (!session || (session.role !== 'admin' && (session.role !== 'user' || session.sub !== userId))) throw new PlayerHistoryError(403, 'このチームのメンバーは操作できません');
}

export async function getPlayerHistory(entryId: string, session: Session | null): Promise<HistoryTeam[]> {
    const entry = await db.teamEntry.findUnique({ where: { id: entryId }, select: { userId: true, players: { select: playerSelect } } });
    if (!entry) throw new PlayerHistoryError(404, 'チームが見つかりません');
    ownsEntry(entry.userId, session);
    const teams = await db.teamEntry.findMany({
        where: { userId: entry.userId, id: { not: entryId } }, orderBy: { createdAt: 'desc' },
        select: { id: true, teamName: true, tournamentId: true, createdAt: true, players: { select: playerSelect, orderBy: { createdAt: 'asc' } } },
    });
    const projects = await db.project.findMany({ where: { id: { in: [...new Set(teams.map(team => team.tournamentId))] } }, select: { id: true, name: true, isTestProject: true } });
    const projectMap = new Map(projects.map(project => [project.id, project]));
    const existingIds = new Set(entry.players.map(player => player.id));
    const existingNames = new Set(entry.players.map(playerIdentity));
    return teams.filter(team => team.players.length && !projectMap.get(team.tournamentId)?.isTestProject).map(team => ({
        id: team.id, teamName: team.teamName, projectName: projectMap.get(team.tournamentId)?.name || team.tournamentId, createdAt: team.createdAt.toISOString(),
        players: team.players.map(player => ({ ...player, wristbandColor: player.wristbandColor || undefined, alreadyAdded: existingIds.has(copiedId(entryId, player.id)) || existingNames.has(playerIdentity(player)) })),
    }));
}

function parseDrafts(body: unknown): PlayerImportDraft[] {
    if (!body || typeof body !== 'object' || !('players' in body) || !Array.isArray(body.players) || !body.players.length || body.players.length > MAX_HISTORY_IMPORT) throw new PlayerHistoryError(400, `追加するメンバーを1〜${MAX_HISTORY_IMPORT}人選んでください`);
    const drafts = body.players.map((value: unknown) => {
        if (!value || typeof value !== 'object') throw new PlayerHistoryError(400, '選手情報が不正です');
        const input = value as Record<string, unknown>;
        if (typeof input.sourcePlayerId !== 'string' || !input.sourcePlayerId || typeof input.name !== 'string' || !input.name.trim() || typeof input.furigana !== 'string' || !input.furigana.trim() || typeof input.insurance !== 'boolean' || typeof input.wristbandColor !== 'string' || !['赤', '青', '黄'].includes(input.wristbandColor)) throw new PlayerHistoryError(400, '氏名・フリガナ・保険・リストバンドを確認してください');
        return { sourcePlayerId: input.sourcePlayerId, name: input.name.trim(), furigana: input.furigana.trim(), insurance: input.insurance, wristbandColor: input.wristbandColor };
    });
    if (new Set(drafts.map(player => player.sourcePlayerId)).size !== drafts.length) throw new PlayerHistoryError(400, '同じメンバーが複数選択されています');
    return drafts;
}

export async function importPlayers(entryId: string, body: unknown, session: Session | null): Promise<{ players: Player[]; added: number; skipped: number }> {
    const drafts = parseDrafts(body);
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await db.$transaction(async tx => {
                const entry = await tx.teamEntry.findUnique({ where: { id: entryId }, select: { userId: true, tournamentId: true, status: true, players: { select: { ...playerSelect, isRepresentative: true }, orderBy: { createdAt: 'asc' } } } });
                if (!entry) throw new PlayerHistoryError(404, 'チームが見つかりません');
                ownsEntry(entry.userId, session);
                const project = await tx.project.findUnique({ where: { id: entry.tournamentId }, select: { entryEndDate: true } });
                if (session?.role !== 'admin' && (entry.status === 'submitted' || (project?.entryEndDate && project.entryEndDate.getTime() < Date.now()))) throw new PlayerHistoryError(403, '受付期間外、または本エントリー完了後のため追加できません');
                const sources = await tx.player.findMany({ where: { id: { in: drafts.map(player => player.sourcePlayerId) }, teamEntry: { userId: entry.userId, id: { not: entryId } } }, select: { id: true, teamEntry: { select: { tournamentId: true } } } });
                if (sources.length !== drafts.length) throw new PlayerHistoryError(403, '引用元のメンバーを確認できません。自分が登録した別チームから選んでください');
                const testProjects = await tx.project.findMany({ where: { id: { in: sources.map(player => player.teamEntry.tournamentId) }, isTestProject: true }, select: { id: true } });
                if (testProjects.length) throw new PlayerHistoryError(403, 'テスト大会のメンバーは引用できません');
                const existingIds = new Set(entry.players.map(player => player.id));
                const existingNames = new Set(entry.players.map(playerIdentity));
                const players: Player[] = entry.players.map(player => ({ ...player, wristbandColor: player.wristbandColor || undefined }));
                let added = 0;
                let skipped = 0;
                for (const draft of drafts) {
                    const id = copiedId(entryId, draft.sourcePlayerId);
                    const identity = playerIdentity(draft);
                    if (existingIds.has(id) || existingNames.has(identity)) { skipped++; continue; }
                    const player = await tx.player.create({ data: { id, entryId, name: draft.name, furigana: draft.furigana, insurance: draft.insurance, wristbandColor: draft.wristbandColor, isRepresentative: false }, select: { ...playerSelect, isRepresentative: true } });
                    players.push({ ...player, wristbandColor: player.wristbandColor || undefined });
                    added++;
                    existingIds.add(id); existingNames.add(identity);
                }
                return { players, added, skipped };
            }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
            const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            if (code === 'P2034' || code === 'P2002') {
                if (attempt < 2) continue;
                throw new PlayerHistoryError(409, '別の画面でも更新されています。内容を確認して、もう一度追加してください');
            }
            throw error;
        }
    }
    throw new PlayerHistoryError(409, '追加できませんでした。もう一度お試しください');
}
