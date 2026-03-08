process.env.DATABASE_URL = "postgresql://postgres:sxe39rtQ0KXPjqsr@db.hcgiirydbsqsdfwqkefm.supabase.co:5432/postgres?pgbouncer=true";
const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const projects = await prisma.project.findMany();
        console.log('Projects count:', projects.length);
        if (projects.length > 0) console.log('First Project:', projects[0]);
        const users = await prisma.user.findMany();
        console.log('Users count:', users.length);
        const entries = await prisma.teamEntry.findMany();
        console.log('Entries count:', entries.length);
    } catch (e) {
        console.error('DB Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
