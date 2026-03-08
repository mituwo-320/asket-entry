const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const projects = await prisma.project.findMany();
  console.log('--- Projects ---');
  projects.forEach(p => console.log(p.id, p.name, 'maxTeams:', p.maxTeams));
  const entries = await prisma.teamEntry.findMany({
      where: { status: { not: 'cancelled' } }
  });
  console.log('--- Active Entries ---');
  entries.forEach(e => console.log(e.id, 'tournament:', e.tournamentId, e.teamName, e.status));
}
main().catch(console.error).finally(() => prisma.$disconnect());
