/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const directory = mkdtempSync(join(tmpdir(), 'asket-env-check-'));
const script = join(process.cwd(), 'scripts/guard-production-build.mjs');
const keys = ['DATABASE_URL', 'ADMIN_PASSWORD', 'MANAGEMENT_PASSWORD', 'SESSION_SECRET', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_APP_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ADMIN_EMAIL', 'CRON_SECRET'];
const check = (target: string, values: Record<string, string> = {}) => {
  const env = { ...process.env }; keys.forEach(key => delete env[key]);
  return spawnSync(process.execPath, [script], { cwd: directory, env: { ...env, VERCEL_ENV: target, ...values }, encoding: 'utf8' });
};
afterAll(() => rmSync(directory, { recursive: true, force: true }));
test('production builds are blocked before deployment when required credentials are missing', () => {
  const result = check('production'); expect(result.status).toBe(1); expect(result.stderr).toContain('SESSION_SECRET');
});
test('preview builds can be reviewed without production credentials', () => expect(check('preview').status).toBe(0));
test('the production gate validates presence without ever printing secret values', () => {
  const result = check('production', { DATABASE_URL: 'postgresql://test:test@localhost:5432/test', ADMIN_PASSWORD: 'fixture-admin-password', MANAGEMENT_PASSWORD: 'fixture-management-password', SESSION_SECRET: 'fixture-session-key-more-than-32-characters', NEXT_PUBLIC_APP_URL: 'https://example.invalid', SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '587', SMTP_USER: 'mail@example.invalid', SMTP_PASS: 'fixture-smtp-secret', ADMIN_EMAIL: 'admin@example.invalid', CRON_SECRET: 'fixture-cron-secret' });
  expect(result.status).toBe(0); expect(result.stdout + result.stderr).not.toContain('fixture-smtp-secret');
});
