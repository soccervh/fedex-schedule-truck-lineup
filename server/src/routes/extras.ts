import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get mandates for a date
router.get('/mandates', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const mandates = await prisma.mandate.findMany({
      where: { date: new Date(date as string) },
      include: {
        user: { select: { id: true, name: true, role: true, shift: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(mandates);
  } catch (error) {
    console.error('Get mandates error:', error);
    res.status(500).json({ error: 'Failed to get mandates' });
  }
});

// Create mandate (OP_LEAD+)
router.post('/mandates', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { userId, date, note } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });

    const mandate = await prisma.mandate.upsert({
      where: { userId_date: { userId, date: new Date(date) } },
      update: { note, createdBy: req.user!.userId },
      create: { userId, date: new Date(date), note, createdBy: req.user!.userId },
      include: {
        user: { select: { id: true, name: true, role: true, shift: true } },
        creator: { select: { name: true } },
      },
    });

    res.json(mandate);
  } catch (error) {
    console.error('Create mandate error:', error);
    res.status(500).json({ error: 'Failed to create mandate' });
  }
});

// Delete mandate (OP_LEAD+)
router.delete('/mandates/:id', authenticate, requireAccessLevel('OP_LEAD'), async (req, res) => {
  try {
    await prisma.mandate.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete mandate error:', error);
    res.status(500).json({ error: 'Failed to delete mandate' });
  }
});

// Get volunteers for a date
router.get('/volunteers', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const volunteers = await prisma.volunteer.findMany({
      where: { date: new Date(date as string) },
      include: {
        user: { select: { id: true, name: true, role: true, shift: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(volunteers);
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({ error: 'Failed to get volunteers' });
  }
});

// Create volunteer (self-service for any authenticated user, or OP_LEAD+ for others)
router.post('/volunteers', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, shift, userId } = req.body;
    if (!date || !shift) return res.status(400).json({ error: 'date and shift are required' });

    const targetUserId = userId || req.user!.userId;

    // Only OP_LEAD+ can volunteer someone else
    if (targetUserId !== req.user!.userId) {
      const isManager = ['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel as string);
      if (!isManager) return res.status(403).json({ error: 'Cannot volunteer someone else' });
    }

    const volunteer = await prisma.volunteer.upsert({
      where: { userId_date: { userId: targetUserId, date: new Date(date) } },
      update: { shift },
      create: { userId: targetUserId, date: new Date(date), shift },
      include: {
        user: { select: { id: true, name: true, role: true, shift: true } },
      },
    });

    res.json(volunteer);
  } catch (error) {
    console.error('Create volunteer error:', error);
    res.status(500).json({ error: 'Failed to create volunteer' });
  }
});

// Delete volunteer (own or OP_LEAD+)
router.delete('/volunteers/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({ where: { id: req.params.id as string } });
    if (!volunteer) return res.status(404).json({ error: 'Not found' });

    const isOwn = volunteer.userId === req.user!.userId;
    const isManager = ['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel as string);
    if (!isOwn && !isManager) return res.status(403).json({ error: 'Not authorized' });

    await prisma.volunteer.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete volunteer error:', error);
    res.status(500).json({ error: 'Failed to delete volunteer' });
  }
});

export default router;
