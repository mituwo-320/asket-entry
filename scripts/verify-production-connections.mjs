#!/usr/bin/env node
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

nextEnv.loadEnvConfig(process.cwd());

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[release-preflight] Production connection checks deferred for local/Preview builds.');
} else {
  const db = new PrismaClient({ log: [] });
  let transport;
  let stage = 'database';
  try {
    // Read only. Never seed fixtures or modify live application rows during a build.
    await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const models = ['user', 'project', 'teamEntry', 'player', 'match', 'event', 'setting', 'tournamentBracket', 'printChecklistItem', 'backup'];
      await Promise.all(models.map(model => tx[model].findFirst({ select: { id: true } })));
    }, { timeout: 30000 });
    console.log('[release-preflight] Production database connection and application-table reads passed.');

    stage = 'SMTP';
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    // SMTP handshake/authentication only: no recipient and no message are submitted.
    await transport.verify();
    console.log('[release-preflight] SMTP connection/authentication passed; no email was sent. Delivery remains a separate check.');
  } catch (error) {
    const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'FAILED';
    console.error('[release-preflight] ' + stage + ' failed (' + code + '). Deployment stopped; credentials and raw errors are not logged.');
    process.exitCode = 1;
  } finally {
    transport?.close();
    await db.$disconnect();
  }
}
