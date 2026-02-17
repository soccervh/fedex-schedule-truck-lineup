import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get briefing for date (all users)
router.get('/', authenticate, async (req, res) => {
  try {
    const dateStr = req.query.date as string;
    if (!dateStr) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const date = new Date(dateStr + 'T00:00:00.000Z');

    const briefing = await prisma.dailyBriefing.findUnique({
      where: { date },
    });

    // Return empty object if no briefing exists yet
    res.json(briefing || { date: dateStr, startTime: null, planeArrival: null, lateFreight: null });
  } catch (error) {
    console.error('Get briefing error:', error);
    res.status(500).json({ error: 'Failed to get briefing' });
  }
});

// Create/update briefing for date (OP_LEAD+)
router.put('/', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { date: dateStr, startTime, planeArrival, lateFreight } = req.body;

    if (!dateStr) {
      return res.status(400).json({ error: 'Date required' });
    }

    const date = new Date(dateStr + 'T00:00:00.000Z');

    const briefing = await prisma.dailyBriefing.upsert({
      where: { date },
      update: { startTime, planeArrival, lateFreight },
      create: { date, startTime, planeArrival, lateFreight },
    });

    res.json(briefing);
  } catch (error) {
    console.error('Update briefing error:', error);
    res.status(500).json({ error: 'Failed to update briefing' });
  }
});

export default router;
