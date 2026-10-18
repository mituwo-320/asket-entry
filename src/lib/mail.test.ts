/** @jest-environment node */
import nodemailer from 'nodemailer';
import { sendAdminNotificationEmail, sendPasswordResetEmail, sendUserRegistrationEmail } from './mail';
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn(() => ({ sendMail: jest.fn() })) } }));
const sendMail = jest.mocked(nodemailer.createTransport).mock.results[0].value.sendMail as jest.Mock;
let errorLog: jest.SpyInstance;
let infoLog: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks(); sendMail.mockResolvedValue({ messageId: 'fixture' });
  process.env.SMTP_HOST = 'smtp.example.invalid'; process.env.SMTP_USER = 'sender@example.invalid'; process.env.SMTP_PASS = 'fixture-smtp-password';
  process.env.ADMIN_EMAIL = 'admin@example.invalid'; process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.invalid';
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {}); infoLog = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
test('registration emails escape submitted names in HTML while retaining readable plain text', async () => {
  const data = { teamName: '<a href="https://evil.invalid">チーム</a>', representative: '代表 & 連絡', email: 'user@example.invalid', projectName: '<大会>' };
  expect(await sendUserRegistrationEmail(data)).toBe(true); expect(await sendAdminNotificationEmail(data)).toBe(true);
  for (const [mail] of sendMail.mock.calls) {
    expect(mail.html).toContain('&lt;a href=&quot;https://evil.invalid&quot;&gt;チーム&lt;/a&gt;');
    expect(mail.html).not.toContain(data.teamName); expect(mail.text).toContain(data.teamName);
  }
});
test('missing SMTP does not pretend to send or write reset tokens to logs', async () => {
  delete process.env.SMTP_PASS;
  expect(await sendPasswordResetEmail('user@example.invalid', 'sensitive-reset-token')).toBe(false);
  expect(sendMail).not.toHaveBeenCalled();
  expect(JSON.stringify([errorLog.mock.calls, infoLog.mock.calls])).not.toMatch(/sensitive-reset-token|user@example/);
});
test('SMTP errors do not leak transport credentials or recipient details into logs', async () => {
  sendMail.mockRejectedValueOnce(new Error('fixture-smtp-password user@example.invalid'));
  expect(await sendPasswordResetEmail('user@example.invalid', 'sensitive-reset-token')).toBe(false);
  expect(JSON.stringify([errorLog.mock.calls, infoLog.mock.calls])).not.toMatch(/fixture-smtp-password|user@example|sensitive-reset-token/);
});
