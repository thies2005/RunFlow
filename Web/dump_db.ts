import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.aiProvider.findMany().then(r => console.log(JSON.stringify(r))).finally(() => prisma.$disconnect());
