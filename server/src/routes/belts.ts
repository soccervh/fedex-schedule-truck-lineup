import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

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
                    homeArea: true,
                    role: true,
                  },
                },
              },
            },
            truckAssignments: {
              where: { date: targetDate },
              include: {
                truck: true,
              },
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
        const truckAssignment = spot.truckAssignments[0];
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
                    homeArea: true,
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
