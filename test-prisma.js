const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.create({
        data: {
            email: 'test2@example.com',
            name: 'Test Setup 2',
            phone: '1234567890',
            password: 'password'
        }
    });
    console.log('Created User:', user);
    const users = await prisma.user.findMany();
    console.log('All Users:', users.length);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
