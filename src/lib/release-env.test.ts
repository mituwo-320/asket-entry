/** @jest-environment node */
import { spawnSync } from 'node:child_process';

const baseline = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ADMIN_PASSWORD: 'a'.repeat(16),
  MANAGEMENT_PASSWORD: 'm'.repeat(16),
  SESSION_SECRET: 's'.repeat(32),
  NEXT_PUBLIC_APP_URL: 'https://release.example.invalid',
  SMTP_HOST: 'smtp.example.invalid',
  SMTP_PORT: '587',
  SMTP_USER: 'test@example.invalid',
  SMTP_PASS: 'test-only-value',
  ADMIN_EMAIL: 'test@example.invalid',
  CRON_SECRET: 'c'.repeat(16),
  STAFF_PASSWORD_MIN_LENGTH: '',
};

function check(overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, ['scripts/check-release-env.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, ...baseline, ...overrides },
    encoding: 'utf8',
  });
}

describe('release environment password policy', () => {
  it('retains the default policy', () => {
    expect(check().status).toBe(0);
  });
  it('rejects shorter staff passwords without an explicit policy', () => {
    expect(check({ ADMIN_PASSWORD: 'a'.repeat(10), MANAGEMENT_PASSWORD: 'm'.repeat(6) }).status).toBe(1);
  });
  it('accepts staff passwords meeting an explicitly configured minimum', () => {
    expect(check({ STAFF_PASSWORD_MIN_LENGTH: '6', ADMIN_PASSWORD: 'a'.repeat(10), MANAGEMENT_PASSWORD: 'm'.repeat(6) }).status).toBe(0);
  });
  it('rejects passwords below the configured minimum', () => {
    expect(check({ STAFF_PASSWORD_MIN_LENGTH: '6', MANAGEMENT_PASSWORD: 'm'.repeat(5) }).status).toBe(1);
  });
  it.each(['0', 'abc', '6.5'])('rejects invalid minimum %s', value => {
    expect(check({ STAFF_PASSWORD_MIN_LENGTH: value }).status).toBe(1);
  });
  it('does not lower the Cron secret requirement', () => {
    const result = check({ STAFF_PASSWORD_MIN_LENGTH: '6', CRON_SECRET: 'c'.repeat(15) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CRON_SECRET');
  });
  it('does not lower the session secret requirement', () => {
    const result = check({ STAFF_PASSWORD_MIN_LENGTH: '6', SESSION_SECRET: 's'.repeat(31) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SESSION_SECRET');
  });
  it('still rejects missing required configuration', () => {
    expect(check({ STAFF_PASSWORD_MIN_LENGTH: '6', SMTP_PASS: '' }).status).toBe(1);
  });
});
