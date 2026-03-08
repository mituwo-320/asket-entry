const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function check() {
    process.env.DATABASE_URL = "postgresql://postgres:sxe39rtQ0KXPjqsr@db.hcgiirydbsqsdfwqkefm.supabase.co:5432/postgres?pgbouncer=true";
    const projects = await prisma.project.findMany();
    const settings = await prisma.setting.findFirst({ where: { id: 'default' } });

    console.log("=== Settings ===");
    console.log("Global OpenChat Link:", settings?.lineOpenChatLink);

    console.log("\n=== Projects ===");
    for (const p of projects) {
        console.log(`[${p.id}] ${p.name}`);
        console.log(`  - LINE Link: ${p.lineOpenChatLink || '未設定'}`);
        console.log(`  - End Date: ${p.entryEndDate || '未設定'}`);
    }

    // Check entries for the first user
    const user = await prisma.user.findFirst();
    if (user) {
        console.log(`\n=== Entries for User ${user.email} ===`);
        const entries = await prisma.teamEntry.findMany({ where: { userId: user.id } });
        for (const e of entries) {
            console.log(`  - Tournament ID: ${e.tournamentId}`);
        }
    }
}
check()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
