import { config } from 'dotenv';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_MASTER_USERNAME ?? 'master';
  const password = process.env.SEED_MASTER_PASSWORD ?? '1234';
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`MASTER '${username}' already exists`);
    return;
  }
  await prisma.user.create({
    data: {
      username,
      name: 'Master',
      platformRole: 'MASTER',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`MASTER '${username}' created (password: ${password})`);
}

main().finally(() => prisma.$disconnect());
