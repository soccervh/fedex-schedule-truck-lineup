import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Update route override for a spot
router.patch('/:id/route-override', authenticate, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { routeOverride } = req.body;

    if (routeOverride !== null && (typeof routeOverride !== 'number' || !Number.isInteger(routeOverride))) {
      return res.status(400).json({ error: 'routeOverride must be an integer or null' });
    }

    const spot = await prisma.spot.findUnique({ where: { id: parseInt(id) } });
    if (!spot) {
      return res.status(404).json({ error: 'Spot not found' });
    }

    const updated = await prisma.spot.update({
      where: { id: parseInt(id) },
      data: { routeOverride },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update route override error:', error);
    res.status(500).json({ error: 'Failed to update route override' });
  }
});

export default router;
