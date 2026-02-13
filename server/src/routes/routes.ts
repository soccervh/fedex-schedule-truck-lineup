import { Router } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all active routes (all users)
router.get('/', authenticate, async (req, res) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to get routes' });
  }
});

// Create route (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { number, assignedArea, beltSpotId } = req.body;

    if (!number || !assignedArea) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    const existing = await prisma.route.findUnique({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: 'Route number already exists' });
    }

    const route = await prisma.route.create({
      data: {
        number,
        assignedArea,
        beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
      },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
    });

    res.status(201).json(route);
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route (manager only)
router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { number, assignedArea, beltSpotId } = req.body;

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        number,
        assignedArea,
        beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
      },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
    });

    res.json(route);
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Deactivate route (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);

    await prisma.route.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Deactivate route error:', error);
    res.status(500).json({ error: 'Failed to deactivate route' });
  }
});

export default router;
