#!/bin/sh
set -e

echo "Waiting for database..."
sleep 5

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run seed || echo "Seeding failed or already done"

echo "Starting application..."
exec "$@"
