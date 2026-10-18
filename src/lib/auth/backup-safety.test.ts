/** @jest-environment node */
import { db } from '@/lib/db';
import { POST } from '@/app/api/admin/backups/restore/route';
import { createSession } from './session';

jest.mock('@/lib/db', () => ({ db: { backup: { findFirst: jest.fn() }, $transaction: jest.fn(), teamEntry: { deleteMany: jest.fn() } } }));
const tx = { user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }, player: { deleteMany: jest.fn(), create: jest.fn() }, teamEntry: { deleteMany: jest.fn(), create: jest.fn() } };
beforeEach(() => {
  jest.clearAllMocks(); process.env.SESSION_SECRET = 'test-session-signing-key-at-least-32-characters'; process.env.ADMIN_PASSWORD = 'test-admin-password';
  (db.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
  tx.user.findFirst.mockResolvedValue({ id: 'user' }); tx.user.findUnique.mockResolvedValue({ id: 'user' });
  tx.teamEntry.create.mockResolvedValue({ id: 'entry' });
});
const request = () => new Request('https://example.test/api/admin/backups/restore', { method: 'POST', headers: { cookie: `admin_auth=${createSession('admin', 'admin', process.env.ADMIN_PASSWORD!)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: 'backup.json' }) });
test('a corrupt backup is rejected before deleting any data', async () => {
  (db.backup.findFirst as jest.Mock).mockResolvedValue({ tournamentId: 'event', data: JSON.stringify({ tournamentId: 'other', users: [], entries: [] }) });
  expect((await POST(request())).status).toBe(400);
  expect(db.$transaction).not.toHaveBeenCalled();
});
test('all destructive restore work is inside the transaction and a failure returns an error', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (db.backup.findFirst as jest.Mock).mockResolvedValue({ tournamentId: 'event', data: JSON.stringify({ tournamentId: 'event', users: [{ id: 'user', email: 'test@example.invalid' }], entries: [{ id: 'entry', userId: 'user', tournamentId: 'event', teamName: 'チーム' }] }) });
  tx.teamEntry.create.mockRejectedValueOnce(new Error('insert failure'));
  expect((await POST(request())).status).toBe(500);
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30000 });
  expect(tx.teamEntry.deleteMany).toHaveBeenCalled(); expect(db.teamEntry.deleteMany).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});
