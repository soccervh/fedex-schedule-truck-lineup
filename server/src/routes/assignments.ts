import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Helper: get weekday dates for a given date's work week (Mon-Fri)
function getWeekDates(date: Date): Date[] {
  const dates: Date[] = [];
  const day = date.getUTCDay();
  // Find Monday of this week
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  // Mon through Sat (0=Mon to 5=Sat)
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    if (d >= date) { // only remaining days from the selected date onward
      dates.push(d);
    }
  }
  return dates;
}

// Create or update assignment
router.post('/', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { spotId, userId, date, truckNumber, duration } = req.body;

    if (!spotId || !userId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveDuration = duration || 'TODAY';
    const targetDate = new Date(date);

    // Check if there's a template assignment for this spot/day
    const dayOfWeek = targetDate.getDay();
    const templateAssignment = await prisma.templateAssignment.findUnique({
      where: {
        spotId_dayOfWeek: { spotId, dayOfWeek },
      },
    });

    const effectiveTruckNumber = truckNumber || '';

    const isOverride = templateAssignment
      ? templateAssignment.userId !== userId ||
        templateAssignment.truckNumber !== effectiveTruckNumber
      : false;

    // Determine which dates to create assignments for
    let dates: Date[] = [targetDate];
    if (effectiveDuration === 'WEEK') {
      dates = getWeekDates(targetDate);
    }

    let result;
    for (const d of dates) {
      result = await prisma.assignment.upsert({
        where: {
          spotId_date: { spotId, date: d },
        },
        update: {
          userId,
          truckNumber: effectiveTruckNumber,
          isOverride,
          duration: effectiveDuration,
        },
        create: {
          spotId,
          userId,
          date: d,
          truckNumber: effectiveTruckNumber,
          isOverride,
          duration: effectiveDuration,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });
    }

    // For UNTIL_FILLED, also create assignments for next 4 weeks
    if (effectiveDuration === 'UNTIL_FILLED') {
      for (let week = 1; week <= 4; week++) {
        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
          const futureDate = new Date(targetDate);
          futureDate.setUTCDate(futureDate.getUTCDate() + (week * 7) + dayOffset - targetDate.getUTCDay());
          if (futureDate.getUTCDay() === 0) continue; // skip Sunday
          await prisma.assignment.upsert({
            where: {
              spotId_date: { spotId, date: futureDate },
            },
            update: {
              userId,
              truckNumber: effectiveTruckNumber,
              isOverride,
              duration: effectiveDuration,
            },
            create: {
              spotId,
              userId,
              date: futureDate,
              truckNumber: effectiveTruckNumber,
              isOverride,
              duration: effectiveDuration,
            },
          });
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Update assignment truck number
router.patch('/:id/truck', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { truckNumber } = req.body;

    if (!truckNumber) {
      return res.status(400).json({ error: 'Truck number is required' });
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: { truckNumber, isOverride: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Update assignment truck error:', error);
    res.status(500).json({ error: 'Failed to update assignment truck' });
  }
});

// Delete assignment (reset to unassigned)
router.delete('/:id', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.assignment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// Apply template to date range
router.post('/apply-template', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all template assignments
    const templates = await prisma.templateAssignment.findMany({
      include: { spot: true },
    });

    const created: any[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);

      for (const template of dayTemplates) {
        const existing = await prisma.assignment.findUnique({
          where: {
            spotId_date: { spotId: template.spotId, date: current },
          },
        });

        if (!existing) {
          const assignment = await prisma.assignment.create({
            data: {
              spotId: template.spotId,
              userId: template.userId,
              date: new Date(current),
              truckNumber: template.truckNumber,
              isOverride: false,
            },
          });
          created.push(assignment);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    res.json({ created: created.length });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// Get user's assignments (for driver view)
// Get current user's permanent route (for area/start time)
router.get('/my-route', authenticate, async (req: AuthRequest, res) => {
  try {
    const route = await prisma.route.findFirst({
      where: { driverId: req.user!.userId, isActive: true },
      select: {
        id: true,
        number: true,
        loadLocation: true,
        assignedArea: true,
      },
    });
    res.json(route);
  } catch (error) {
    console.error('Get my route error:', error);
    res.status(500).json({ error: 'Failed to get route' });
  }
});

router.get('/my-assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = { userId: req.user!.userId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        spot: {
          include: { belt: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get my assignments error:', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

export default router;
