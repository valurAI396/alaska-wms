import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const operatorPassword = await bcrypt.hash('operator123', 10);

    // Upsert Admin
    await prisma.user.upsert({
        where: { email: 'admin@alaskawms.com' },
        update: {},
        create: {
            email: 'admin@alaskawms.com',
            name: 'Admin Alaska',
            passwordHash: adminPassword,
            role: 'admin',
        },
    });

    // Upsert Operator
    await prisma.user.upsert({
        where: { email: 'operator@alaskawms.com' },
        update: {},
        create: {
            email: 'operator@alaskawms.com',
            name: 'Operator Alaska',
            passwordHash: operatorPassword,
            role: 'operator',
        },
    });

    console.log('Seed completed: Created admin and operator users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
