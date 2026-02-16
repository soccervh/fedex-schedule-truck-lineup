import { prisma } from '../lib/prisma';

function getCurrentResetDate(): Date {
  const now = new Date();
  const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 5, 1); // June 1st (month is 0-indexed)
}

export async function ensureBalancesReset(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const currentResetDate = getCurrentResetDate();

  if (user.balanceResetDate < currentResetDate) {
    // Calculate sick day carryover: min(remaining sick days, 10)
    const approvedSickDays = await prisma.timeOff.count({
      where: {
        userId,
        type: 'SICK',
        status: 'APPROVED',
        date: { gte: user.balanceResetDate, lt: currentResetDate },
      },
    });
    const remainingSick = user.sickDays + user.sickDayCarryover - approvedSickDays;
    const carryover = Math.min(Math.max(remainingSick, 0), 10);

    return prisma.user.update({
      where: { id: userId },
      data: {
        vacationWeeks: 0,
        vacationDays: 0,
        personalDays: 0,
        holidays: 0,
        sickDays: 0,
        sickDayCarryover: carryover,
        balanceResetDate: currentResetDate,
      },
    });
  }

  return user;
}

export async function getUsedBalances(userId: string, sinceDate: Date) {
  const types = ['VACATION_WEEK', 'VACATION_DAY', 'PERSONAL', 'HOLIDAY', 'SICK'] as const;
  const result: Record<string, number> = {};

  for (const type of types) {
    result[type] = await prisma.timeOff.count({
      where: {
        userId,
        type,
        status: 'APPROVED',
        date: { gte: sinceDate },
      },
    });
  }

  // VACATION_WEEK: count unique weeks (groups of 5 days), divide by 5
  if (result['VACATION_WEEK'] > 0) {
    result['VACATION_WEEK'] = Math.ceil(result['VACATION_WEEK'] / 5);
  }

  return result;
}
