import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import type { RouteSchedule } from '@prisma/client';

const router = Router();

// Helper: get allowed schedules for a given day of week (0=Sun, 6=Sat)
export function getAllowedSchedules(dayOfWeek: number): RouteSchedule[] | null {
  switch (dayOfWeek) {
    case 0: return null; // Sunday - no routes
    case 1: return ['MON_FRI']; // Monday
    case 6: return ['SAT_ONLY']; // Saturday
    default: return ['MON_FRI', 'TUE_FRI']; // Tue-Fri
  }
}

// Get all active routes (all users), optionally filtered by date
router.get('/', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    const where: any = { isActive: true };

    if (date) {
      const targetDate = new Date(date as string);
      const dayOfWeek = targetDate.getUTCDay();
      const allowed = getAllowedSchedules(dayOfWeek);
      if (allowed === null) {
        return res.json([]);
      }
      where.schedule = { in: allowed };
    }

    const routes = await prisma.route.findMany({
      where,
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
    const { number, assignedArea, beltSpotId, loadLocation, schedule } = req.body;

    if (!number || !assignedArea) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    // Enforce: routes 500-560 must be SAT_ONLY
    const routeNum = parseInt(number);
    let routeSchedule = schedule || 'MON_FRI';
    if (routeNum >= 500 && routeNum <= 560) {
      routeSchedule = 'SAT_ONLY';
    } else if (routeSchedule === 'SAT_ONLY') {
      return res.status(400).json({ error: 'Only routes 500-560 can be Saturday Only' });
    }

    const existing = await prisma.route.findUnique({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: 'Route number already exists' });
    }

    const effectiveBeltSpotId = assignedArea === 'BELT_SPOT' ? beltSpotId : null;
    const route = await prisma.route.create({
      data: {
        number,
        assignedArea,
        beltSpotId: effectiveBeltSpotId,
        loadLocation: loadLocation || null,
        pullerBeltSpotId: loadLocation === 'PULLER' && effectiveBeltSpotId ? effectiveBeltSpotId : null,
        schedule: routeSchedule,
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
    const { number, assignedArea, beltSpotId, loadLocation, schedule } = req.body;

    if (assignedArea === 'BELT_SPOT' && !beltSpotId) {
      return res.status(400).json({ error: 'Belt spot required when area is BELT_SPOT' });
    }

    // Enforce: routes 500-560 must be SAT_ONLY
    const routeNum = parseInt(number);
    let routeSchedule = schedule;
    if (routeSchedule) {
      if (routeNum >= 500 && routeNum <= 560) {
        routeSchedule = 'SAT_ONLY';
      } else if (routeSchedule === 'SAT_ONLY') {
        return res.status(400).json({ error: 'Only routes 500-560 can be Saturday Only' });
      }
    }

    const effectiveBeltSpotId = assignedArea === 'BELT_SPOT' ? beltSpotId : null;
    const route = await prisma.route.update({
      where: { id },
      data: {
        number,
        assignedArea,
        beltSpotId: effectiveBeltSpotId,
        loadLocation: loadLocation || null,
        pullerBeltSpotId: loadLocation === 'PULLER' && effectiveBeltSpotId ? effectiveBeltSpotId : undefined,
        ...(routeSchedule && { schedule: routeSchedule }),
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

// Set puller belt spot for a route
router.patch('/:id/puller-spot', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { pullerBeltSpotId } = req.body;

    const route = await prisma.route.update({
      where: { id },
      data: { pullerBeltSpotId: pullerBeltSpotId || null },
    });

    res.json(route);
  } catch (error) {
    console.error('Update puller spot error:', error);
    res.status(500).json({ error: 'Failed to update puller spot' });
  }
});

// Get routes pulled by a specific belt spot
router.get('/pulled-by/:spotId', authenticate, async (req, res) => {
  try {
    const spotId = parseInt(req.params.spotId as string);
    const routes = await prisma.route.findMany({
      where: { pullerBeltSpotId: spotId, isActive: true },
      orderBy: { number: 'asc' },
    });
    res.json(routes);
  } catch (error) {
    console.error('Get pulled routes error:', error);
    res.status(500).json({ error: 'Failed to get pulled routes' });
  }
});

// Update route load location (HIGHEST_MANAGER only)
router.patch('/:id/load-location', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { loadLocation } = req.body;

    // If setting to PULLER, auto-assign this route to be pulled by its own belt spot
    const existing = await prisma.route.findUnique({ where: { id } });
    const data: any = { loadLocation: loadLocation || null };
    if (loadLocation === 'PULLER' && existing?.beltSpotId) {
      data.pullerBeltSpotId = existing.beltSpotId;
    }

    const route = await prisma.route.update({
      where: { id },
      data,
    });

    res.json(route);
  } catch (error) {
    console.error('Update load location error:', error);
    res.status(500).json({ error: 'Failed to update load location' });
  }
});

export default router;
