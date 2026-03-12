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

// Check if a driver's work schedule includes the given day of week
function isWorkDay(workSchedule: string, dayOfWeek: number): boolean {
  if (workSchedule === 'MON_FRI') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (workSchedule === 'TUE_SAT') return dayOfWeek >= 2 && dayOfWeek <= 6;
  return false;
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
              where: routeWhere,
              select: {
                id: true, number: true, loadLocation: true, schedule: true,
                driverId: true,
                driver: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    workSchedule: true,
                  },
                },
                facilitySpot: {
                  select: {
                    id: true, number: true, label: true,
                    area: { select: { name: true, subArea: true } },
                  },
                },
              },
              orderBy: { number: 'asc' },
            },
            pulledRoutes: {
              where: { isActive: true },
              select: { id: true, number: true },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });

    // Collect all user IDs that may need time-off checks:
    // both from explicit assignments AND from route.driver fallbacks
    const allUserIds = new Set<string>();
    for (const belt of belts) {
      for (const spot of belt.spots) {
        for (const a of spot.assignments) {
          allUserIds.add(a.userId);
        }
        const route = spot.routes[0];
        if (route?.driverId) {
          allUserIds.add(route.driverId);
        }
      }
    }

    const timeOffs = allUserIds.size > 0
      ? await prisma.timeOff.findMany({
          where: {
            userId: { in: [...allUserIds] },
            date: targetDate,
            status: 'APPROVED',
          },
        })
      : [];

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
        const truckAssignment = rawTruckAssignment &&
          rawTruckAssignment.truck.status !== 'RETIRED' &&
          rawTruckAssignment.truck.status !== 'OUT_OF_SERVICE'
          ? rawTruckAssignment : undefined;

        const route = spot.routes[0] || null;

        // Use explicit assignment if exists, otherwise fall back to route's permanent driver
        let effectiveAssignment: any = null;
        if (assignment) {
          const isOff = timeOffUserIds.has(assignment.userId);
          effectiveAssignment = {
            id: assignment.id,
            truckNumber: assignment.truckNumber,
            isOverride: assignment.isOverride,
            user: assignment.user,
            needsCoverage: isOff,
          };
        } else if (route?.driver && route.driver.id && isWorkDay(route.driver.workSchedule, dayOfWeek)) {
          const isOff = timeOffUserIds.has(route.driver.id);
          effectiveAssignment = {
            id: `route-driver-${route.id}`,
            truckNumber: '',
            isOverride: false,
            user: { id: route.driver.id, name: route.driver.name, role: route.driver.role },
            needsCoverage: isOff,
          };
        }

        return {
          id: spot.id,
          number: spot.number,
          routeOverride: spot.routeOverride,
          route: route ? { id: route.id, number: route.number, loadLocation: route.loadLocation, schedule: route.schedule, facilitySpot: route.facilitySpot } : null,
          pulledRoutes: spot.pulledRoutes,
          assignment: effectiveAssignment,
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
