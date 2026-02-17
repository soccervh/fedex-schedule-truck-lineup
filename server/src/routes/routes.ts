import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
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

// Create route (HIGHEST_MANAGER only)
router.post('/', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { number, assignedArea, beltSpotId, loadLocation } = req.body;

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
        loadLocation: loadLocation || null,
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

// Get routes for a specific belt spot
router.get('/by-spot/:spotId', authenticate, async (req, res) => {
  try {
    const spotId = parseInt(req.params.spotId as string);
    const routes = await prisma.route.findMany({
      where: { beltSpotId: spotId, isActive: true },
      orderBy: { number: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Get routes by spot error:', error);
    res.status(500).json({ error: 'Failed to get routes for spot' });
  }
});

// Assign a route to a spot (HIGHEST_MANAGER only)
router.put('/assign-to-spot', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { routeId, spotId } = req.body;

    if (!routeId || !spotId) {
      return res.status(400).json({ error: 'routeId and spotId are required' });
    }

    // Unlink any route currently on this spot
    await prisma.route.updateMany({
      where: { beltSpotId: spotId },
      data: { beltSpotId: null, assignedArea: 'EO_POOL' },
    });

    // Assign the new route to this spot
    const route = await prisma.route.update({
      where: { id: routeId },
      data: { beltSpotId: spotId, assignedArea: 'BELT_SPOT' },
    });

    res.json(route);
  } catch (error) {
    console.error('Assign route to spot error:', error);
    res.status(500).json({ error: 'Failed to assign route to spot' });
  }
});

// Update route (HIGHEST_MANAGER only)
router.put('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { number, assignedArea, beltSpotId, loadLocation } = req.body;

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        number,
        assignedArea,
        beltSpotId: assignedArea === 'BELT_SPOT' ? beltSpotId : null,
        loadLocation: loadLocation || null,
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

// Deactivate route (HIGHEST_MANAGER only)
router.delete('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
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

// Update route load location (HIGHEST_MANAGER only)
router.patch('/:id/load-location', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { loadLocation } = req.body;

    const route = await prisma.route.update({
      where: { id },
      data: { loadLocation: loadLocation || null },
    });

    res.json(route);
  } catch (error) {
    console.error('Update load location error:', error);
    res.status(500).json({ error: 'Failed to update load location' });
  }
});

export default router;
