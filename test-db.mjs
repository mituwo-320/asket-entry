import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    try {
        const projects = await prisma.project.findMany()
        console.log('Projects:', projects.length)
    } catch (e) {
        console.error('DB Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}
main()
