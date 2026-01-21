import { Router } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get template for a specific belt and day of week
router.get('/belt/:beltId', authenticate, async (req, res) => {
  try {
    const { beltId } = req.params;
    const { dayOfWeek } = req.query;

    const whereClause: any = {
      spot: { beltId: parseInt(beltId) },
    };

    if (dayOfWeek !== undefined) {
      whereClause.dayOfWeek = parseInt(dayOfWeek as string);
    }

    const templates = await prisma.templateAssignment.findMany({
      where: whereClause,
      include: {
        spot: true,
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
            role: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { spot: { number: 'asc' } }],
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create or update template assignment
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { spotId, userId, dayOfWeek, truckNumber } = req.body;

    if (spotId === undefined || !userId || dayOfWeek === undefined || !truckNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const template = await prisma.templateAssignment.upsert({
      where: {
        spotId_dayOfWeek: { spotId, dayOfWeek },
      },
      update: {
        userId,
        truckNumber,
      },
      create: {
        spotId,
        userId,
        dayOfWeek,
        truckNumber,
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

    res.json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Delete template assignment
router.delete('/:spotId/:dayOfWeek', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { spotId, dayOfWeek } = req.params;

    await prisma.templateAssignment.delete({
      where: {
        spotId_dayOfWeek: {
          spotId: parseInt(spotId),
          dayOfWeek: parseInt(dayOfWeek),
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
