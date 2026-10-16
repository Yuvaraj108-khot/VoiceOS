import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database:', process.env.DATABASE_URL?.split('@')[1]);
  const employees = await prisma.aIEmployee.findMany({
    select: {
      id: true,
      name: true,
      firstMessage: true,
      systemPrompt: true,
      voiceProfile: true,
      status: true
    }
  });
  console.log('Found employees:', JSON.stringify(employees, null, 2));
}

main().catch(err => {
  console.error('Database connection failed:', err);
}).finally(() => prisma.$disconnect());
