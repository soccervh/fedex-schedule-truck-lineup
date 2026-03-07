import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import type { RouteSchedule } from '@prisma/client';

const router = Router();

// Helper: get allowed schedules for a given day of week (0=Sun, 6=Sat)
function getAllowedSchedules(dayOfWeek: number): RouteSchedule[] | null {
  switch (dayOfWeek) {
    case 0: return null; // Sunday - no routes
    case 1: return ['MON_FRI']; // Monday
    case 6: return ['SAT_ONLY']; // Saturday
    default: return ['MON_FRI', 'TUE_FRI']; // Tue-Fri
  }
}

// Get all belts with spot counts
router.get('/', authenticate, async (req, res) => {
  try {
    const belts = await prisma.belt.findMany({
      include: {
        _count: { select: { spots: true } },
        spots: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json(belts);
  } catch (error) {
    console.error('Get belts error:', error);
    res.status(500).json({ error: 'Failed to get belts' });
  }
});

// Get ALL belts with spots and assignments for a specific date (single request)
router.get('/all/assignments', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getUTCDay();
    const allowedSchedules = getAllowedSchedules(dayOfWeek);

    const routeWhere: any = { isActive: true };
    if (allowedSchedules) {
      routeWhere.schedule = { in: allowedSchedules };
    }

    // Determine effective date for truck assignments (carry-forward)
    // If no truck assignments exist for the requested date, use the most recent date that has them
    let truckAssignmentDate = targetDate;
    const hasTruckAssignments = await prisma.truckSpotAssignment.count({
      where: { date: targetDate },
    });
    if (hasTruckAssignments === 0) {
      const mostRecent = await prisma.truckSpotAssignment.findFirst({
        where: { date: { lte: targetDate } },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
      if (mostRecent) {
        truckAssignmentDate = mostRecent.date;
      }
    }

    const belts = await prisma.belt.findMany({
      orderBy: { id: 'asc' },
      include: {
        spots: {
          orderBy: { number: 'asc' },
          include: {
            assignments: {
              where: { date: targetDate },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
            truckAssignments: {
              where: { date: truckAssignmentDate },
              include: {
                truck: true,
              },
            },
            routes: {
              where: { isActive: true },
              select: { id: true, number: true, loadLocation: true, schedule: true },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });

    // Get all assigned user IDs across all belts
    const assignedUserIds = belts
      .flatMap(belt => belt.spots)
      .flatMap(s => s.assignments)
      .map(a => a.userId);

    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: assignedUserIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Format response
    const beltsWithStatus = belts.map(belt => ({
      id: belt.id,
      name: belt.name,
      letter: belt.letter,
      baseNumber: belt.baseNumber,
      spots: belt.spots.map(spot => {
        const assignment = spot.assignments[0];
        const rawTruckAssignment = spot.truckAssignments[0];
        // Filter out carried-forward assignments for trucks that have since been retired or moved OOS
        const truckAssignment = rawTruckAssignment &&
          rawTruckAssignment.truck.status !== 'RETIRED' &&
          rawTruckAssignment.truck.status !== 'OUT_OF_SERVICE'
          ? rawTruckAssignment : undefined;
        const isOff = assignment ? timeOffUserIds.has(assignment.userId) : false;

        return {
          id: spot.id,
          number: spot.number,
          routeOverride: spot.routeOverride,
          route: spot.routes[0] || null,
          assignment: assignment
            ? {
                id: assignment.id,
                truckNumber: assignment.truckNumber,
                isOverride: assignment.isOverride,
                user: assignment.user,
                needsCoverage: isOff,
              }
            : null,
          truckAssignment: truckAssignment
            ? {
                id: truckAssignment.id,
                truck: truckAssignment.truck,
              }
            : null,
        };
      }),
    }));

    res.json(beltsWithStatus);
  } catch (error) {
    console.error('Get all belt assignments error:', error);
    res.status(500).json({ error: 'Failed to get belt assignments' });
  }
});

// Get belt with spots and assignments for a specific date
router.get('/:beltId/assignments', authenticate, async (req, res) => {
  try {
    const { beltId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const belt = await prisma.belt.findUnique({
      where: { id: parseInt(beltId as string) },
      include: {
        spots: {
          orderBy: { number: 'asc' },
          include: {
            assignments: {
              where: { date: targetDate },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!belt) {
      return res.status(404).json({ error: 'Belt not found' });
    }

    // Get time-off for assigned users on this date
    const assignedUserIds = belt.spots
      .flatMap(s => s.assignments)
      .map(a => a.userId);

    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: assignedUserIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Format response
    const spotsWithStatus = belt.spots.map(spot => {
      const assignment = spot.assignments[0];
      const isOff = assignment ? timeOffUserIds.has(assignment.userId) : false;

      return {
        id: spot.id,
        number: spot.number,
        routeOverride: spot.routeOverride,
        assignment: assignment
          ? {
              id: assignment.id,
              truckNumber: assignment.truckNumber,
              isOverride: assignment.isOverride,
              user: assignment.user,
              needsCoverage: isOff,
            }
          : null,
      };
    });

    res.json({
      id: belt.id,
      name: belt.name,
      letter: belt.letter,
      baseNumber: belt.baseNumber,
      spots: spotsWithStatus,
    });
  } catch (error) {
    console.error('Get belt assignments error:', error);
    res.status(500).json({ error: 'Failed to get belt assignments' });
  }
});

export default router;
