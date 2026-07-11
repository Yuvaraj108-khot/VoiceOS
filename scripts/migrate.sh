#!/bin/bash
# Runs Prisma migrations
echo "Running database migrations..."
npx prisma migrate dev --name init
echo "Migrations applied successfully."
