import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '..', 'legacy-data.json');
const prisma = new PrismaClient();
const defaultPasswordHash = bcrypt.hashSync('LegacyImport#2026', 12);

const cleanText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

function parseDate(value) {
  const match = cleanText(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getUserRow(row) {
  if (!Array.isArray(row) || row.length === 0) return null;

  const firstId = cleanText(row[0]);
  const secondId = cleanText(row[1]);
  const legacyId = firstId.startsWith('USINT') ? firstId : secondId;
  const firstLayout = !firstId.startsWith('USINT');
  const email = cleanText(row[3]).toLowerCase();
  if (!legacyId.startsWith('USINT') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const name = cleanText(row[2]);
  const department = cleanText(row[6]) || null;
  const startDate = parseDate(firstLayout ? row[7] : row[1]) ?? parseDate(row[7]);
  const endDate = parseDate(firstLayout ? row[8] : row[8]);
  const sourceStatus = cleanText(firstLayout ? row[8] : row[9]).toLowerCase();

  return { legacyId, email, name, department, startDate, endDate, sourceStatus };
}

function mapStatus(sourceStatus) {
  if (sourceStatus === 'active') return 'ACTIVE';
  if (sourceStatus === 'pending') return 'PENDING';
  if (sourceStatus === 'terminated' || sourceStatus === 'resigned' || sourceStatus === 'completed') return 'INACTIVE';
  return 'PENDING';
}

function mapRole(department) {
  const value = department.toLowerCase();
  return value.includes('lead') || value.includes('captain') ? 'MENTOR' : 'INTERN';
}

async function main() {
  const rows = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('legacy-data.json must contain an array of rows');

  const records = rows.map(getUserRow).filter(Boolean);
  const seenEmails = new Set();
  const failures = [];
  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    if (seenEmails.has(record.email)) continue;
    seenEmails.add(record.email);

    try {
      const existing = await prisma.user.findUnique({ where: { email: record.email } });
      const status = mapStatus(record.sourceStatus);
      const role = mapRole(record.department);
      const user = await prisma.user.upsert({
        where: { email: record.email },
        update: {
          name: record.name,
          department: record.department,
          status,
        },
        create: {
          email: record.email,
          passwordHash: defaultPasswordHash,
          name: record.name,
          role,
          status,
          department: record.department,
          emailVerified: false,
        },
      });

      await prisma.internProfile.upsert({
        where: { userId: user.id },
        update: {
          ...(record.startDate ? { startDate: record.startDate } : {}),
          endDate: record.endDate,
          isTL: role === 'MENTOR',
        },
        create: {
          userId: user.id,
          startDate: record.startDate ?? new Date(),
          endDate: record.endDate,
          isTL: role === 'MENTOR',
        },
      });

      if (existing) updated += 1;
      else inserted += 1;
      console.log(`${existing ? 'updated' : 'inserted'} ${record.legacyId} ${record.email}`);
    } catch (error) {
      failures.push({ email: record.email, message: error.message });
      console.error(`failed ${record.legacyId} ${record.email}: ${error.message}`);
    }
  }

  console.log(`Legacy import complete: ${inserted} inserted, ${updated} updated, ${failures.length} failed, ${records.length} email rows`);
  if (failures.length > 0) process.exitCode = 1;
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}