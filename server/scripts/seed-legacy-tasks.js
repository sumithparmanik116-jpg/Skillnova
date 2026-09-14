import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TASK_BLUEPRINTS = [
  { title: 'Implement JWT Auth Flow', priority: 'HIGH' },
  { title: 'Responsive Landing Page UI', priority: 'MEDIUM' },
  { title: 'PostgreSQL Schema Setup', priority: 'HIGH' },
  { title: 'Bugfix: WebSocket Reconnection', priority: 'URGENT' },
  { title: 'API Endpoint Integration', priority: 'MEDIUM' },
  { title: 'Add Validation and Error States', priority: 'LOW' },
];

const ACTIVE_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const SCORE_BY_INDEX = [88, 94, 79, 91, 86, 97];

function taskStatus(userStatus, index) {
  if (userStatus === 'INACTIVE') return 'DONE';
  return ACTIVE_STATUSES[index % ACTIVE_STATUSES.length];
}

function taskDates(user, index, status) {
  const base = new Date(user.createdAt).getTime();
  const createdAt = new Date(base + (index + 1) * 3 * 86400000);
  const dueDate = new Date(createdAt.getTime() + (index + 5) * 86400000);
  const completedAt = status === 'DONE'
    ? new Date(createdAt.getTime() + (index + 2) * 86400000)
    : null;
  return { createdAt, dueDate, completedAt };
}

async function getSeedProject() {
  const existing = await prisma.project.findFirst({ where: { name: 'Legacy Team Deliverables' } });
  if (existing) return existing;

  const creator = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!creator) throw new Error('Cannot create legacy task project: no admin or super-admin exists');

  return prisma.project.create({
    data: {
      name: 'Legacy Team Deliverables',
      description: 'Imported web development deliverables for the legacy SkillNova team.',
      status: 'ACTIVE',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      createdById: creator.id,
    },
  });
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['INTERN', 'MENTOR'] } },
    orderBy: { email: 'asc' },
  });
  if (users.length === 0) throw new Error('No interns or mentors found');

  const project = await getSeedProject();
  let inserted = 0;
  let existing = 0;

  for (const user of users) {
    const taskCount = 3 + (user.email.length % 4);
    for (let index = 0; index < taskCount; index += 1) {
      const blueprint = TASK_BLUEPRINTS[index];
      const title = `[Legacy Seed] ${blueprint.title}`;
      const status = taskStatus(user.status, index);
      const score = SCORE_BY_INDEX[index];
      const dates = taskDates(user, index, status);
      const prior = await prisma.projectTask.findFirst({
        where: { projectId: project.id, assigneeId: user.id, title },
      });

      if (prior) {
        existing += 1;
        continue;
      }

      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          assigneeId: user.id,
          title,
          description: `Legacy team deliverable. Evaluation score: ${score}/100.`,
          status,
          priority: blueprint.priority,
          dueDate: dates.dueDate,
          completedAt: dates.completedAt,
          createdAt: dates.createdAt,
        },
      });
      inserted += 1;
    }
  }

  console.log(`Legacy task seed complete: ${inserted} inserted, ${existing} already present, ${users.length} users processed, project=${project.id}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}