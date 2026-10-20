/** @jest-environment node */
import { createSession, verifySession, readSession, credentialStamp } from './session';
import { createResetToken, verifyResetToken } from '../tokens';

beforeEach(() => { process.env.SESSION_SECRET = 'test-session-signing-key-at-least-32-characters'; process.env.ADMIN_PASSWORD = 'test-admin-password'; process.env.MANAGEMENT_PASSWORD = 'test-management-password'; });

test.each(['admin', 'management', 'user'] as const)('%s sessions require a matching signed role and expire', role => {
  const credential = role === 'admin' ? process.env.ADMIN_PASSWORD! : role === 'management' ? process.env.MANAGEMENT_PASSWORD! : 'test-password-hash';
  const token = createSession(role, 'actor', credential, 1000);
  expect(verifySession(token, role, 1000)?.sub).toBe('actor');
  expect(verifySession(token, role, 1000 + 8 * 86400000)).toBeNull();
  expect(verifySession(token + 'x', role, 1000)).toBeNull();
  expect(verifySession(token + '.extra', role, 1000)).toBeNull();
  expect(verifySession('true', role)).toBeNull();
});
test('unsigned legacy cookies cannot grant staff privileges', () => expect(readSession('admin_auth=true; management_auth=true')).toBeNull());
test('changing a staff password invalidates issued sessions', () => { const token = createSession('admin', 'admin', process.env.ADMIN_PASSWORD!); process.env.ADMIN_PASSWORD = 'different-admin-password'; expect(verifySession(token, 'admin')).toBeNull(); });
test('staff tokens cannot be reinterpreted as participant tokens', () => { const token = createSession('management', 'user', process.env.MANAGEMENT_PASSWORD!); expect(verifySession(token, 'user')).toBeNull(); });
test('a missing signing secret fails closed', () => { delete process.env.SESSION_SECRET; delete process.env.NEXTAUTH_SECRET; expect(() => createSession('admin', 'admin', 'value')).toThrow(); expect(readSession('admin_auth=true')).toBeNull(); });
test('password reset signatures expire and are invalidated by password changes', () => { const token = createResetToken('user', 'first-hash'); expect(verifyResetToken(token, 'first-hash')?.sub).toBe('user'); expect(verifyResetToken(token, 'second-hash')).toBeNull(); expect(verifyResetToken(token + '.extra', 'first-hash')).toBeNull(); expect(credentialStamp('first-hash')).not.toContain('first-hash'); });
