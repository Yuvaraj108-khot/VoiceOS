import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.aIEmployee.updateMany({
    data: {
      firstMessage: "Hello and welcome! Press 1 for English. हिंदी के लिए दो दबाएं。"
    }
  });
  console.log('Successfully updated AIEmployee firstMessage');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
