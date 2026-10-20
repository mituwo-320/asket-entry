#!/usr/bin/env node
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const failures = [];
const required = ['DATABASE_URL', 'ADMIN_PASSWORD', 'MANAGEMENT_PASSWORD', 'NEXT_PUBLIC_APP_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ADMIN_EMAIL', 'CRON_SECRET'];
for (const key of required) if (!process.env[key]) failures.push(`${key}: 未設定`);
const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 32) failures.push('SESSION_SECRET または NEXTAUTH_SECRET: 32文字以上が必要');
const staffMinimum = Number(process.env.STAFF_PASSWORD_MIN_LENGTH || '16');
if (!Number.isInteger(staffMinimum) || staffMinimum < 6 || staffMinimum > 128) failures.push('STAFF_PASSWORD_MIN_LENGTH: 6〜128の整数が必要');
for (const key of ['ADMIN_PASSWORD', 'MANAGEMENT_PASSWORD']) if (process.env[key] && process.env[key].length < staffMinimum) failures.push(`${key}: 設定された最小文字数を満たしていません`);
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 16) failures.push('CRON_SECRET: 16文字以上が必要');
try { const url = new URL(process.env.NEXT_PUBLIC_APP_URL); if (url.protocol !== 'https:' || url.hostname === 'localhost') failures.push('NEXT_PUBLIC_APP_URL: 本番のHTTPS URLが必要'); } catch { if (process.env.NEXT_PUBLIC_APP_URL) failures.push('NEXT_PUBLIC_APP_URL: URLの形式が不正'); }
try { if (!['postgres:', 'postgresql:'].includes(new URL(process.env.DATABASE_URL).protocol)) failures.push('DATABASE_URL: PostgreSQLの接続URLが必要'); } catch { if (process.env.DATABASE_URL) failures.push('DATABASE_URL: URLの形式が不正'); }
if (process.env.SMTP_PORT && ![25, 465, 587, 2525].includes(Number(process.env.SMTP_PORT))) failures.push('SMTP_PORT: 設定を確認してください');
if (failures.length) { console.error('公開前の環境設定チェック: 未完了\n' + failures.map(x => `- ${x}`).join('\n')); process.exitCode = 1; }
else console.log('公開前の環境設定チェック: 必須項目は設定済み（値は非表示。接続・メール到達と環境分離は別途確認が必要）');
