import { prisma } from '../src/lib/prisma';

async function main() {
  const emps = await prisma.aIEmployee.findMany({
    select: { id: true, name: true, firstMessage: true, status: true }
  });
  console.log('Employees:', JSON.stringify(emps, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
