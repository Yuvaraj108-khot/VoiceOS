#!/bin/bash
# Seeds the database
echo "Seeding the database..."
npx ts-node prisma/seed.ts
echo "Database seeded successfully."
