import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany()
  console.log('Projects:', projects)
  const entries = await prisma.teamEntry.findMany({
      where: { status: { not: 'cancelled' } }
  })
  console.log('Active Entries count:', entries.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
