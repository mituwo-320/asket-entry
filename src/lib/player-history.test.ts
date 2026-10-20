/** @jest-environment node */
import { db } from './db';
import { getPlayerHistory, importPlayers } from './player-history';
import type { Session } from './auth/session';
import { MAX_HISTORY_IMPORT } from './player-history-types';

jest.mock('./db', () => ({ db: { teamEntry: { findUnique: jest.fn(), findMany: jest.fn() }, project: { findMany: jest.fn() }, $transaction: jest.fn() } }));
const tx = { teamEntry: { findUnique: jest.fn() }, project: { findUnique: jest.fn(), findMany: jest.fn() }, player: { findMany: jest.fn(), create: jest.fn() } };
const owner: Session = { role: 'user', sub: 'owner', credential: 'fixture', exp: 9999999999 };
const admin: Session = { ...owner, role: 'admin', sub: 'admin' };
const rep = { id: 'representative', name: '代表 太郎', furigana: 'ダイヒョウ タロウ', insurance: true, wristbandColor: '赤', isRepresentative: true };
const source = { id: 'old-player', name: '山田 太郎', furigana: 'ヤマダ タロウ', insurance: true, wristbandColor: '赤' };
const draft = { sourcePlayerId: source.id, name: '山田 次郎', furigana: 'ヤマダ ジロウ', insurance: false, wristbandColor: '青' };
const target = () => ({ userId: 'owner', tournamentId: 'current-project', status: 'draft', players: [rep] });

beforeEach(() => {
    jest.clearAllMocks();
    (db.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
    tx.teamEntry.findUnique.mockResolvedValue(target());
    tx.project.findUnique.mockResolvedValue({ entryEndDate: new Date('2099-12-31') });
    tx.project.findMany.mockResolvedValue([]);
    tx.player.findMany.mockImplementation(async ({ where }) => where.id.in.map((id: string) => ({ id, teamEntry: { tournamentId: 'past-project' } })));
    tx.player.create.mockImplementation(async ({ data }) => ({ id: data.id, name: data.name, furigana: data.furigana, insurance: data.insurance, wristbandColor: data.wristbandColor, isRepresentative: data.isRepresentative }));
    (db.teamEntry.findUnique as jest.Mock).mockResolvedValue(target());
    (db.teamEntry.findMany as jest.Mock).mockResolvedValue([{ id: 'past-entry', teamName: '去年のチーム', tournamentId: 'past-project', createdAt: new Date('2025-01-01'), players: [source, rep] }]);
    (db.project.findMany as jest.Mock).mockResolvedValue([{ id: 'past-project', name: '春の大会', isTestProject: false }]);
});

test('history is limited to the target owner and excludes the current team; likely duplicates are marked', async () => {
    const result = await getPlayerHistory('current-entry', owner);
    expect(db.teamEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', id: { not: 'current-entry' } } }));
    expect(result[0]).toMatchObject({ teamName: '去年のチーム', projectName: '春の大会', players: [{ ...source, alreadyAdded: false }, { ...rep, alreadyAdded: true }] });
});
test('an administrator also sees the target owner’s history, rather than the administrator’s teams', async () => {
    await getPlayerHistory('current-entry', admin);
    expect(db.teamEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', id: { not: 'current-entry' } } }));
});
test('history excludes test tournaments and returns a useful empty list', async () => {
    (db.project.findMany as jest.Mock).mockResolvedValue([{ id: 'past-project', isTestProject: true }]);
    expect(await getPlayerHistory('current-entry', owner)).toEqual([]);
});
test('edited information is copied to a new player, never overwriting a source or copying its representative role', async () => {
    const result = await importPlayers('current-entry', { players: [{ ...draft, isRepresentative: true, entryId: 'past-entry' }] }, owner);
    expect(result).toMatchObject({ added: 1, skipped: 0, players: [rep, { name: draft.name, furigana: draft.furigana, insurance: false, wristbandColor: '青', isRepresentative: false }] });
    const data = tx.player.create.mock.calls[0][0].data;
    expect(data.id).not.toBe(source.id); expect(data.entryId).toBe('current-entry'); expect(data.isRepresentative).toBe(false);
    expect(tx.player.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['old-player'] }, teamEntry: { userId: 'owner', id: { not: 'current-entry' } } } }));
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(source.name).toBe('山田 太郎');
});
test('a retry after a lost response skips the existing copy and returns the full roster for resynchronization', async () => {
    const first = await importPlayers('current-entry', { players: [draft] }, owner);
    tx.teamEntry.findUnique.mockResolvedValue({ ...target(), players: first.players });
    tx.player.create.mockClear();
    const second = await importPlayers('current-entry', { players: [{ ...draft, name: '再送時の別名' }] }, owner);
    expect(second).toMatchObject({ added: 0, skipped: 1, players: first.players });
    expect(tx.player.create).not.toHaveBeenCalled();
});
test('matching normalized names are skipped, including duplicates selected from different past teams', async () => {
    const same = { ...draft, sourcePlayerId: 'second-source', name: '山田　次郎', furigana: 'ﾔﾏﾀﾞ ｼﾞﾛｳ' };
    const result = await importPlayers('current-entry', { players: [draft, same] }, owner);
    expect(result).toMatchObject({ added: 1, skipped: 1 }); expect(tx.player.create).toHaveBeenCalledTimes(1);
});
test('a source outside the owner’s other teams is rejected before any writes', async () => {
    tx.player.findMany.mockResolvedValue([]);
    await expect(importPlayers('current-entry', { players: [draft] }, owner)).rejects.toMatchObject({ status: 403 });
    expect(tx.player.create).not.toHaveBeenCalled();
});
test('test tournament source IDs cannot bypass the history filter', async () => {
    tx.project.findMany.mockResolvedValue([{ id: 'past-project' }]);
    await expect(importPlayers('current-entry', { players: [draft] }, owner)).rejects.toMatchObject({ status: 403 });
    expect(tx.player.create).not.toHaveBeenCalled();
});
test.each([{ ...owner, sub: 'different-owner' }, { ...owner, role: 'management' as const }])('another user or a management session cannot import: %j', async session => {
    await expect(importPlayers('current-entry', { players: [draft] }, session)).rejects.toMatchObject({ status: 403 });
    expect(tx.player.create).not.toHaveBeenCalled();
});
test.each(['submitted', 'deadline'])('participant imports enforce the %s restriction inside the transaction', async restriction => {
    if (restriction === 'submitted') tx.teamEntry.findUnique.mockResolvedValue({ ...target(), status: 'submitted' });
    else tx.project.findUnique.mockResolvedValue({ entryEndDate: new Date('2000-01-01') });
    await expect(importPlayers('current-entry', { players: [draft] }, owner)).rejects.toMatchObject({ status: 403 });
    expect(tx.player.create).not.toHaveBeenCalled();
});
test('the existing admin deadline/submitted exception remains available for the target owner’s members', async () => {
    tx.teamEntry.findUnique.mockResolvedValue({ ...target(), status: 'submitted' });
    tx.project.findUnique.mockResolvedValue({ entryEndDate: new Date('2000-01-01') });
    expect(await importPlayers('current-entry', { players: [draft] }, admin)).toMatchObject({ added: 1 });
});
test.each([{}, { players: [] }, { players: [{ ...draft, name: ' ' }] }, { players: [{ ...draft, furigana: '' }] }, { players: [{ ...draft, insurance: 'false' }] }, { players: [{ ...draft, wristbandColor: '黒' }] }, { players: [draft, draft] }, { players: Array.from({ length: MAX_HISTORY_IMPORT + 1 }, (_, index) => ({ ...draft, sourcePlayerId: String(index) })) }])('invalid or excessive imports are rejected without a transaction: %j', async body => {
    await expect(importPlayers('current-entry', body, owner)).rejects.toMatchObject({ status: 400 });
    expect(db.$transaction).not.toHaveBeenCalled();
});
test('an insertion failure rejects the entire transaction instead of saving outside it', async () => {
    tx.player.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(importPlayers('current-entry', { players: [draft] }, owner)).rejects.toThrow('database unavailable');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
});
test('serialization conflicts are retried, but repeated conflicts return a recoverable error', async () => {
    (db.$transaction as jest.Mock).mockRejectedValueOnce({ code: 'P2034' });
    expect(await importPlayers('current-entry', { players: [draft] }, owner)).toMatchObject({ added: 1 });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    (db.$transaction as jest.Mock).mockReset().mockRejectedValue({ code: 'P2034' });
    await expect(importPlayers('current-entry', { players: [draft] }, owner)).rejects.toMatchObject({ status: 409 });
    expect(db.$transaction).toHaveBeenCalledTimes(3);
});
