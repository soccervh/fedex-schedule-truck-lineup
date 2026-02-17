import { Router } from 'express';
import { authenticate, requireAccessLevel } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all facility areas with spots and assignments for a specific date
router.get('/areas', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const targetDate = new Date(date as string);

    const facilityAreas = await prisma.facilityArea.findMany({
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
      orderBy: { id: 'asc' },
    });

    // Get time-off for assigned users on this date
    const assignedUserIds = facilityAreas
      .flatMap(area => area.spots)
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

    // Group areas by name and subArea
    const groupedAreas: Record<string, {
      name: string;
      subArea: string | null;
      spots: Array<{
        id: number;
        number: number;
        label: string | null;
        side: string | null;
        assignment: {
          id: string;
          user: {
            id: string;
            name: string;
            homeArea: string;
            role: string;
          };
          needsCoverage: boolean;
        } | null;
      }>;
    }> = {};

    for (const area of facilityAreas) {
      const key = `${area.name}-${area.subArea || 'default'}`;
      groupedAreas[key] = {
        name: area.name,
        subArea: area.subArea,
        spots: area.spots.map(spot => {
          const assignment = spot.assignments[0];
          const isOff = assignment ? timeOffUserIds.has(assignment.userId) : false;

          return {
            id: spot.id,
            number: spot.number,
            label: spot.label,
            side: spot.side,
            assignment: assignment
              ? {
                  id: assignment.id,
                  user: assignment.user,
                  needsCoverage: isOff,
                }
              : null,
          };
        }),
      };
    }

    res.json(groupedAreas);
  } catch (error) {
    console.error('Get facility areas error:', error);
    res.status(500).json({ error: 'Failed to get facility areas' });
  }
});

// Create or update facility assignment
router.post('/assignments', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    const { facilitySpotId, userId, date } = req.body;

    if (!facilitySpotId || !userId || !date) {
      return res.status(400).json({ error: 'facilitySpotId, userId, and date are required' });
    }

    const targetDate = new Date(date);

    const assignment = await prisma.facilityAssignment.upsert({
      where: {
        facilitySpotId_date: {
          facilitySpotId,
          date: targetDate,
        },
      },
      update: { userId },
      create: {
        facilitySpotId,
        userId,
        date: targetDate,
      },
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
    });

    res.json(assignment);
  } catch (error) {
    console.error('Create facility assignment error:', error);
    res.status(500).json({ error: 'Failed to create facility assignment' });
  }
});

// Delete facility assignment
router.delete('/assignments/:assignmentId', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId as string;

    await prisma.facilityAssignment.delete({
      where: { id: assignmentId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete facility assignment error:', error);
    res.status(500).json({ error: 'Failed to delete facility assignment' });
  }
});

export default router;
