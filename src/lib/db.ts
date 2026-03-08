// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Prisma client type might show EPERM locally, but it works on Vercel
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
