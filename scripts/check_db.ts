import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const docs = await prisma.knowledgeDocument.findMany();
  console.log('=== KNOWLEDGE DOCUMENTS IN DB ===');
  console.log(JSON.stringify(docs, null, 2));

  const totalRows = await prisma.businessDataRow.count();
  console.log('\n=== TOTAL BUSINESS DATA ROWS ===', totalRows);

  const sampleRows = await prisma.businessDataRow.findMany({ take: 5 });
  console.log('\n=== SAMPLE BUSINESS DATA ROWS ===');
  console.log(JSON.stringify(sampleRows, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
