/** @jest-environment node */
import { saveUser } from './sheets';
import { db } from './db';
jest.mock('./db', () => ({ db: { user: { upsert: jest.fn() } } }));
beforeEach(() => jest.clearAllMocks());
test.each([{ postalCode: '1000001', address: '東京都千代田区' }, { postalCode: '', address: '' }])('profile saving persists or clears address fields without changing the login password: %j', async fields => {
    (db.user.upsert as jest.Mock).mockResolvedValue({});
    expect(await saveUser({ id: 'user', email: 'test@example.invalid', name: '代表', phone: '09000000000', ...fields })).toBe(true);
    const input = (db.user.upsert as jest.Mock).mock.calls[0][0];
    expect(input.update).toMatchObject(fields);
    expect(input.update).not.toHaveProperty('password');
    expect(input.create).toMatchObject(fields);
});
