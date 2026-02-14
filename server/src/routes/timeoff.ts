import { Router } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get time off for a date range (manager view)
router.get('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const timeOffs = await prisma.timeOff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            homeArea: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }],
    });

    res.json(timeOffs);
  } catch (error) {
    console.error('Get time offs error:', error);
    res.status(500).json({ error: 'Failed to get time offs' });
  }
});

// Get my time off (driver view)
router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  try {
    const timeOffs = await prisma.timeOff.findMany({
      where: { userId: req.user!.userId },
      orderBy: { date: 'desc' },
    });

    res.json(timeOffs);
  } catch (error) {
    console.error('Get my time offs error:', error);
    res.status(500).json({ error: 'Failed to get time offs' });
  }
});

// Request time off (any user)
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { dates, type, note } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0 || !type) {
      return res.status(400).json({ error: 'Dates array and type required' });
    }

    const created = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);

      const existing = await prisma.timeOff.findUnique({
        where: {
          userId_date: { userId: req.user!.userId, date },
        },
      });

      if (!existing) {
        const timeOff = await prisma.timeOff.create({
          data: {
            userId: req.user!.userId,
            date,
            type,
            note,
            status: 'PENDING',
            isImported: false,
          },
        });
        created.push(timeOff);
      }
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Request time off error:', error);
    res.status(500).json({ error: 'Failed to request time off' });
  }
});

// Approve/deny time off (manager only)
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const timeOff = await prisma.timeOff.update({
      where: { id },
      data: { status, note },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(timeOff);
  } catch (error) {
    console.error('Update time off error:', error);
    res.status(500).json({ error: 'Failed to update time off' });
  }
});

// Import time off from CSV (manager only)
router.post('/import', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Entries array required' });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const entry of entries) {
      const { name, date, type } = entry;

      // Find user by name
      const user = await prisma.user.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (!user) {
        results.errors.push(`User not found: ${name}`);
        results.skipped++;
        continue;
      }

      const targetDate = new Date(date);

      const existing = await prisma.timeOff.findUnique({
        where: {
          userId_date: { userId: user.id, date: targetDate },
        },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.timeOff.create({
        data: {
          userId: user.id,
          date: targetDate,
          type: type || 'SCHEDULED_OFF',
          status: 'APPROVED',
          isImported: true,
        },
      });

      results.created++;
    }

    res.json(results);
  } catch (error) {
    console.error('Import time off error:', error);
    res.status(500).json({ error: 'Failed to import time off' });
  }
});

// Get coverage needs for a date
router.get('/coverage-needs', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }

    const targetDate = new Date(date as string);

    // Get all belt spots with their assignments for this date
    const allSpots = await prisma.spot.findMany({
      include: {
        belt: true,
        assignments: {
          where: { date: targetDate },
          include: { user: true },
        },
        routes: {
          where: { isActive: true },
          select: { id: true, number: true, loadLocation: true },
          orderBy: { number: 'asc' },
        },
      },
      orderBy: [{ belt: { id: 'asc' } }, { number: 'asc' }],
    });

    // Get all assignments for this date (for swing driver tracking)
    const assignments = allSpots.flatMap(s => s.assignments);

    // Get approved time offs for assigned users
    const userIds = assignments.map(a => a.userId);
    const timeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: userIds },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const timeOffUserIds = new Set(timeOffs.map(t => t.userId));

    // Find spots needing coverage: unassigned OR assigned user is off
    const needsCoverage: any[] = [];
    for (const spot of allSpots) {
      const assignment = spot.assignments[0];
      const route = spot.routes[0] || null;
      if (!assignment) {
        // Unassigned spot
        needsCoverage.push({
          spot: { id: spot.id, number: spot.number, belt: spot.belt },
          route,
          user: { name: 'Unassigned' },
          reason: 'unassigned',
        });
      } else if (timeOffUserIds.has(assignment.userId)) {
        // Assigned user is off
        needsCoverage.push({
          assignment,
          spot: { id: spot.id, number: spot.number, belt: spot.belt },
          route,
          user: assignment.user,
          reason: 'time_off',
        });
      }
    }

    // Get available swing drivers
    const swingDrivers = await prisma.user.findMany({
      where: {
        role: 'SWING',
        isActive: true,
      },
    });

    const assignedSwingIds = assignments
      .filter(a => a.user.role === 'SWING')
      .map(a => a.userId);

    const swingTimeOffs = await prisma.timeOff.findMany({
      where: {
        userId: { in: swingDrivers.map(s => s.id) },
        date: targetDate,
        status: 'APPROVED',
      },
    });

    const swingOffIds = new Set(swingTimeOffs.map(t => t.userId));

    const availableSwing = swingDrivers.filter(
      s => !assignedSwingIds.includes(s.id) && !swingOffIds.has(s.id)
    );

    res.json({
      needsCoverage,
      availableSwing,
    });
  } catch (error) {
    console.error('Get coverage needs error:', error);
    res.status(500).json({ error: 'Failed to get coverage needs' });
  }
});

export default router;
