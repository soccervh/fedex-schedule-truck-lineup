import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Create or update assignment
router.post('/', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { spotId, userId, date, truckNumber } = req.body;

    if (!spotId || !userId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    const assignment = await prisma.assignment.upsert({
      where: {
        spotId_date: { spotId, date: targetDate },
      },
      update: {
        userId,
        truckNumber: effectiveTruckNumber,
        isOverride,
      },
      create: {
        spotId,
        userId,
        date: targetDate,
        truckNumber: effectiveTruckNumber,
        isOverride,
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
            homeArea: true,
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
