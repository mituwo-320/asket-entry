/** @jest-environment node */
import { db } from '@/lib/db';
import { POST } from '@/app/api/team/update/route';
import { createSession } from './session';
import { findTeamEntry, findUserById, getProjects } from '@/lib/sheets';
jest.mock('@/lib/db', () => ({ db: { user: { findUnique: jest.fn() }, teamEntry: { findUnique: jest.fn() }, $transaction: jest.fn() } }));
jest.mock('@/lib/sheets', () => ({ findTeamEntry: jest.fn(), findUserById: jest.fn(), getProjects: jest.fn() }));
const tx = { teamEntry: { update: jest.fn() }, player: { update: jest.fn() }, user: { update: jest.fn() } };
beforeEach(() => {
  jest.clearAllMocks(); process.env.SESSION_SECRET = 'fixture-session-key-at-least-32-characters';
  (db.user.findUnique as jest.Mock).mockResolvedValue({ password: 'hash' });
  (db.teamEntry.findUnique as jest.Mock).mockResolvedValue({ userId: 'user' });
  (db.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
  jest.mocked(findTeamEntry).mockResolvedValue({ id: 'entry', userId: 'user', tournamentId: 'event', teamName: 'チーム', teamNameKana: '', teamIntroduction: '', isBeginnerFriendlyAccepted: true, status: 'draft', isPaid: false, players: [{ id: 'rep', name: '代表', furigana: '', insurance: true, isRepresentative: true }], createdAt: '2026-01-01' });
  jest.mocked(findUserById).mockResolvedValue({ id: 'user', email: 'user@example.invalid', name: '代表', phone: '09000000000' });
  jest.mocked(getProjects).mockResolvedValue([{ id: 'event', name: '大会', isActive: true, hasClinic: true, clinicLimit: 20 }]);
});
afterEach(() => jest.restoreAllMocks());
const request = (body: unknown) => new Request('https://example.test/api/team/update', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-team-id': 'entry', cookie: `participant_session=${createSession('user', 'user', 'hash')}` }, body: JSON.stringify(body) });
test('a participant profile edit does not write stale payment, receipt, status or other players back to the database', async () => {
  expect((await POST(request({ teamName: '変更後', representativeName: '新代表', isPaid: true, status: 'submitted', receiptName: '変更不可' }))).status).toBe(200);
  expect(tx.teamEntry.update).toHaveBeenCalledWith({ where: { id: 'entry' }, data: { teamName: '変更後' } });
  expect(tx.player.update).toHaveBeenCalledWith({ where: { id: 'rep', entryId: 'entry' }, data: { name: '新代表' } });
  expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { name: '新代表' } });
});
test('a failure to save the representative is propagated from the shared transaction', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  tx.player.update.mockRejectedValueOnce(new Error('save failure'));
  expect((await POST(request({ teamName: '変更後', representativeName: '新代表' }))).status).toBe(500);
  expect(db.$transaction).toHaveBeenCalledTimes(1); expect(tx.user.update).not.toHaveBeenCalled();
});
test('invalid clinic quantities are rejected before any transaction is started', async () => {
  expect((await POST(request({ clinicCount: -1 }))).status).toBe(400);
  expect((await POST(request({ clinicCount: 21 }))).status).toBe(400);
  expect(db.$transaction).not.toHaveBeenCalled();
});
