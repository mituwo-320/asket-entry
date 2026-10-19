/** @jest-environment node */
import { db } from '@/lib/db';
import { getAllAdminData, getProjects, findTeamEntry, savePlayerToEntry, saveProject } from '@/lib/sheets';
import { createSession, SESSION_COOKIES, verifySession } from './session';

jest.mock('@/lib/db', () => ({ db: { user: { findUnique: jest.fn() }, teamEntry: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() }, player: { findUnique: jest.fn() }, project: { findUnique: jest.fn() }, $queryRaw: jest.fn() } }));
jest.mock('@/lib/sheets', () => ({ getAllAdminData: jest.fn(), getProjects: jest.fn(), findTeamEntry: jest.fn(), savePlayerToEntry: jest.fn(), saveProject: jest.fn(), verifyUserLogin: jest.fn() }));
jest.mock('@/lib/mail', () => ({ sendAdminNotificationEmail: jest.fn(), sendUserRegistrationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));

const protectedRoutes = [
  ['admin/data', 'GET'], ['admin/projects', 'GET'], ['admin/projects', 'POST'], ['admin/projects', 'DELETE'],
  ['admin/bracket', 'GET'], ['admin/bracket', 'POST'], ['admin/bracket/update', 'POST'], ['admin/bracket/seed-teams', 'POST'],
  ['admin/backups', 'GET'], ['admin/backups', 'POST'], ['admin/backups/restore', 'POST'], ['admin/checklist', 'GET'], ['admin/checklist', 'POST'], ['admin/checklist', 'PATCH'], ['admin/checklist', 'DELETE'],
  ['admin/entry/delete', 'POST'], ['admin/entry/update', 'POST'], ['admin/match/update', 'POST'], ['admin/schedule/generate', 'POST'], ['admin/settings', 'GET'], ['admin/settings', 'POST'],
  ['management/entry/update', 'POST'], ['settings', 'POST'], ['match/update', 'POST'], ['matches', 'GET'], ['schedule/events', 'GET'], ['schedule/events', 'POST'], ['schedule/events', 'DELETE'],
  ['user/entries', 'GET'], ['user/update', 'PUT'], ['team/data', 'GET'], ['team/update', 'POST'], ['team/submit', 'POST'], ['team/receipt/issue', 'POST'], ['team/receipt/viewed', 'POST'], ['player/save', 'POST'], ['player/delete', 'POST'], ['player/history', 'GET'], ['player/history', 'POST'],
] as const;
const request = (path: string, method: string, cookie = '', body: unknown = {}) => new Request(`https://example.test/api/${path}?userId=user`, { method, headers: { cookie, 'x-team-id': 'entry', 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
const cookie = (role: 'admin' | 'management' | 'user', id = 'user') => `${SESSION_COOKIES[role]}=${createSession(role, id, role === 'admin' ? process.env.ADMIN_PASSWORD! : role === 'management' ? process.env.MANAGEMENT_PASSWORD! : 'fixture-hash')}`;
function route(path: string, method: string): (req: Request) => Promise<Response> { return async request => (await import('@/app/api/' + path + '/route'))[method](request); }

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SESSION_SECRET = 'test-session-signing-key-at-least-32-characters'; process.env.ADMIN_PASSWORD = 'test-admin-password'; process.env.MANAGEMENT_PASSWORD = 'test-management-password';
  (db.user.findUnique as jest.Mock).mockResolvedValue({ password: 'fixture-hash' });
  (db.teamEntry.findUnique as jest.Mock).mockResolvedValue({ userId: 'user', tournamentId: 'event', status: 'draft' });
  (db.project.findUnique as jest.Mock).mockResolvedValue({ entryEndDate: null });
});

describe.each(['', 'admin_auth=true; management_auth=true'])('protected API rejects unsigned cookies %s', legacy => {
  test.each(protectedRoutes)('%s %s rejects before reading or writing data', async (path, method) => {
    const response = await route(path, method)(request(path, method, legacy));
    expect(response.status).toBe(401);
    expect(db.user.findUnique).not.toHaveBeenCalled(); expect(db.teamEntry.findUnique).not.toHaveBeenCalled();
  });
});
test('management can read operational data while participants cannot read the staff directory', async () => {
  jest.mocked(getAllAdminData).mockResolvedValue({ users: [], entries: [] });
  expect((await route('admin/data', 'GET')(request('admin/data', 'GET', cookie('management')))).status).toBe(200);
  jest.mocked(getAllAdminData).mockClear();
  expect((await route('admin/data', 'GET')(request('admin/data', 'GET', cookie('user')))).status).toBe(403);
  expect(getAllAdminData).not.toHaveBeenCalled();
});
test('management cannot change global settings or restore backups', async () => {
  for (const path of ['settings', 'admin/backups/restore']) expect((await route(path, 'POST')(request(path, 'POST', cookie('management')))).status).toBe(403);
});
test('a signed participant cannot select another user or team', async () => {
  const userResponse = await route('user/entries', 'GET')(request('user/entries', 'GET', cookie('user', 'someone-else')));
  expect(userResponse.status).toBe(403);
  (db.teamEntry.findUnique as jest.Mock).mockResolvedValue({ userId: 'someone-else', tournamentId: 'event' });
  expect((await route('team/data', 'GET')(request('team/data', 'GET', cookie('user')))).status).toBe(403);
  expect(findTeamEntry).not.toHaveBeenCalled();
});
test('resetting a participant password invalidates their old session', async () => {
  const old = cookie('user'); (db.user.findUnique as jest.Mock).mockResolvedValue({ password: 'changed-hash' });
  expect((await route('team/data', 'GET')(request('team/data', 'GET', old))).status).toBe(401);
});
test('cross-origin updates are rejected even for a signed administrator', async () => {
  const req = request('settings', 'POST', cookie('admin')); req.headers.set('origin', 'https://other.test');
  expect((await route('settings', 'POST')(req)).status).toBe(403);
});
test('existing-account registration cannot use an unsigned ID', async () => {
  expect((await route('team/register', 'POST')(request('team/register', 'POST', '', { existingUserId: 'user' }))).status).toBe(401);
});
test('operational uniform updates are persisted through the allowed fields', async () => {
  const response = await route('management/entry/update', 'POST')(request('management/entry/update', 'POST', cookie('management'), { entryId: 'entry', updates: { uniformColor: '白', isPaid: true } }));
  expect(response.status).toBe(200);
  expect(db.teamEntry.update).toHaveBeenCalledWith({ where: { id: 'entry' }, data: { uniformColor: '白', isPaid: true } });
});
test('empty project reads never create a mock production tournament', async () => {
  jest.mocked(getProjects).mockResolvedValue([]);
  expect(await (await route('admin/projects', 'GET')(request('admin/projects', 'GET', cookie('admin')))).json()).toEqual({ projects: [] });
  expect(saveProject).not.toHaveBeenCalled();
});
test('an owner cannot overwrite a player belonging to a different team', async () => {
  jest.mocked(findTeamEntry).mockResolvedValue({ id: 'entry', status: 'draft' } as Awaited<ReturnType<typeof findTeamEntry>>);
  (db.player.findUnique as jest.Mock).mockResolvedValue({ id: 'player', entryId: 'other-team', isRepresentative: false });
  expect((await route('player/save', 'POST')(request('player/save', 'POST', cookie('user'), { id: 'player', name: '選手' }))).status).toBe(403);
  expect(savePlayerToEntry).not.toHaveBeenCalled();
});
test('the server also enforces the displayed player-edit deadline', async () => {
  (db.project.findUnique as jest.Mock).mockResolvedValue({ entryEndDate: new Date('2000-01-01') });
  expect((await route('player/save', 'POST')(request('player/save', 'POST', cookie('user'), { id: 'player', name: '選手' }))).status).toBe(403);
  expect(savePlayerToEntry).not.toHaveBeenCalled();
});
test('staff sign-in sets a signed HttpOnly session and missing configuration rejects sign-in', async () => {
  const response = await route('admin/auth', 'POST')(request('admin/auth', 'POST', '', { password: process.env.ADMIN_PASSWORD }));
  expect(response.status).toBe(200);
  const header = response.headers.get('set-cookie')!; expect(header).toContain('HttpOnly'); expect(header).toContain('Path=/');
  const token = header.split(';')[0].slice('admin_auth='.length); expect(verifySession(token, 'admin')?.role).toBe('admin');
  delete process.env.MANAGEMENT_PASSWORD;
  expect((await route('management/auth', 'POST')(request('management/auth', 'POST', '', { password: 'anything' }))).status).toBe(503);
});
test('receipt issuance and viewing use conditional writes to preserve one-time rules', async () => {
  const issued = new Date('2026-01-01');
  (db.teamEntry.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (db.teamEntry.findUnique as jest.Mock).mockResolvedValue({ userId: 'user', isPaid: true, receiptName: '発行済宛名', receiptIssuedAt: issued, receiptViewedAt: issued });
  const res = await route('team/receipt/issue', 'POST')(request('team/receipt/issue', 'POST', cookie('admin'), { receiptName: '別の宛名' }));
  expect(await res.json()).toMatchObject({ alreadyIssued: true, receiptName: '発行済宛名' });
  expect(db.teamEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'entry', isPaid: true, receiptIssuedAt: null } }));
  await route('team/receipt/viewed', 'POST')(request('team/receipt/viewed', 'POST', cookie('admin')));
  expect(db.teamEntry.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'entry', isPaid: true, receiptIssuedAt: { not: null }, receiptViewedAt: null } }));
});


test.each(['GET', 'POST'])('player history %s rejects a target entry owned by someone else', async method => {
  (db.teamEntry.findUnique as jest.Mock).mockResolvedValue({ userId: 'other-user', tournamentId: 'event' });
  expect((await route('player/history', method)(request('player/history', method, cookie('user')))).status).toBe(403);
});
