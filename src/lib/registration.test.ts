/** @jest-environment node */
import { compare } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { registerTeam, RegistrationError } from './registration';

jest.mock('./db', () => ({ db: { $transaction: jest.fn() } }));
const tx = { project: { findUnique: jest.fn() }, user: { findUnique: jest.fn(), create: jest.fn() }, teamEntry: { count: jest.fn(), create: jest.fn() } };
const body = { tournamentId: 'event', name: 'テストチーム', representative: '代表', email: 'test@example.invalid', phone: '09000000000', password: 'test-password', preliminaryNumber: 3 };
const openProject = { id: 'event', name: '大会', isActive: true, isTestProject: false, isWaitlistEnabled: true, maxTeams: 2, hasClinic: false, clinicLimit: 20 };
beforeEach(() => {
  jest.clearAllMocks();
  tx.project.findUnique.mockResolvedValue(openProject);
  tx.teamEntry.count.mockResolvedValue(0);
  tx.user.create.mockResolvedValue({ id: 'new-user', password: 'stored-hash' });
  tx.user.findUnique.mockResolvedValue({ id: 'existing-user', password: 'stored-hash' });
  tx.teamEntry.create.mockResolvedValue({ id: 'new-entry' });
  (db.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
});
test.each([{ isActive: false }, { isTestProject: true }, { entryStartDate: new Date('2999-01-01') }, { entryEndDate: new Date('2000-01-01') }])('registration rejects a project outside its public entry window: %p', async override => {
  tx.project.findUnique.mockResolvedValue({ ...openProject, ...override });
  await expect(registerTeam(body, null)).rejects.toMatchObject({ status: 403 });
  expect(tx.user.create).not.toHaveBeenCalled(); expect(tx.teamEntry.create).not.toHaveBeenCalled();
});
test('user and representative/team are created inside one serializable transaction', async () => {
  const result = await registerTeam(body, null);
  expect(result.entry.id).toBe('new-entry');
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  expect(tx.user.create.mock.calls[0][0].data.password).not.toBe(body.password);
  expect(tx.user.create.mock.calls[0][0].data.password).toMatch(/^\$2/);
  expect(tx.teamEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'draft', isBeginnerFriendlyAccepted: false, preliminaryNumber: 3, userId: 'new-user', players: { create: expect.objectContaining({ isRepresentative: true, name: '代表' }) } }) }));
});
test('capacity checks exclude cancelled entries and block registration before creating the user', async () => {
  tx.project.findUnique.mockResolvedValue({ ...openProject, isWaitlistEnabled: false }); tx.teamEntry.count.mockResolvedValue(2);
  await expect(registerTeam(body, null)).rejects.toBeInstanceOf(RegistrationError);
  expect(tx.teamEntry.count).toHaveBeenCalledWith({ where: { tournamentId: 'event', status: { not: 'cancelled' } } });
  expect(tx.user.create).not.toHaveBeenCalled();
});
test('a full project with waitlisting keeps the original waitlist outcome', async () => {
  tx.teamEntry.count.mockResolvedValue(2);
  expect((await registerTeam(body, null)).isWaitlist).toBe(true);
});
test('a serialization conflict retries without giving up the atomic transaction', async () => {
  (db.$transaction as jest.Mock).mockRejectedValueOnce({ code: 'P2034' });
  await expect(registerTeam(body, null)).resolves.toMatchObject({ count: 1 });
  expect(db.$transaction).toHaveBeenCalledTimes(2);
});
test('another account cannot be selected by supplying an existingUserId', async () => {
  await expect(registerTeam({ ...body, existingUserId: 'other-user' }, { role: 'user', sub: 'user', exp: 9999999999, credential: 'stamp' })).rejects.toMatchObject({ status: 403 });
  expect(db.$transaction).not.toHaveBeenCalled();
});
test('a failure during team creation escapes the transaction and never becomes a success', async () => {
  tx.teamEntry.create.mockRejectedValueOnce(new Error('insert failed'));
  await expect(registerTeam(body, null)).rejects.toThrow('insert failed');
});

test('registration preserves the exact password, including intentional spaces', async () => {
  const password = ' test-password ';
  await registerTeam({ ...body, password }, null);
  expect(await compare(password, tx.user.create.mock.calls[0][0].data.password)).toBe(true);
});

test.each(['', undefined])('an authenticated existing account can register without resending its phone: %p', async phone => {
  const user = { id: 'existing-user', email: body.email, name: body.representative, phone: '09012345678', password: 'stored-hash' };
  tx.user.findUnique.mockResolvedValue(user);
  const result = await registerTeam({ ...body, phone, existingUserId: user.id, password: '' }, { role: 'user', sub: user.id, exp: 9999999999, credential: 'stamp' });
  expect(result.user).toEqual(user);
  expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
  expect(tx.user.create).not.toHaveBeenCalled();
  expect(tx.teamEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: user.id }) }));
});
test.each(['', undefined])('a new account still requires its phone: %p', async phone => {
  await expect(registerTeam({ ...body, phone }, null)).rejects.toMatchObject({ status: 400, message: '電話番号を入力してください' });
  expect(db.$transaction).not.toHaveBeenCalled();
});
test('omitting contact details does not allow selecting a foreign account', async () => {
  await expect(registerTeam({ ...body, phone: '', existingUserId: 'someone-else' }, { role: 'user', sub: 'owner', exp: 9999999999, credential: 'stamp' })).rejects.toMatchObject({ status: 403 });
  expect(db.$transaction).not.toHaveBeenCalled();
});
