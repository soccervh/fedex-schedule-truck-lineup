import { Router } from 'express';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';
import { prisma } from '../lib/prisma';
import { ensureBalancesReset, getUsedBalances } from '../utils/balance';
import type { RouteSchedule } from '@prisma/client';

const router = Router();

// Helper: get allowed schedules for a given day of week (0=Sun, 6=Sat)
function getAllowedSchedules(dayOfWeek: number): RouteSchedule[] | null {
  switch (dayOfWeek) {
    case 0: return null; // Sunday - no routes
    case 1: return ['MON_FRI']; // Monday
    case 6: return ['SAT_ONLY']; // Saturday
    default: return ['MON_FRI', 'TUE_FRI']; // Tue-Fri
  }
}

// Get all people (high-access users see more details)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const isHighAccess = ['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel);

    const people = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: isHighAccess ? true : false,
        role: true,
        phone: isHighAccess ? true : false,
        accessLevel: isHighAccess ? true : false,
        managerId: isHighAccess ? true : false,
        manager: isHighAccess ? { select: { id: true, name: true } } : false,
      },
      orderBy: { name: 'asc' },
    });

    res.json(people);
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Failed to get people' });
  }
});

// Get driver routes for a given date
router.get('/driver-routes', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getUTCDay();
    const allowed = getAllowedSchedules(dayOfWeek);

    if (allowed === null) {
      return res.json({});
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        date: targetDate,
        user: {
          role: { in: ['DRIVER', 'SWING'] },
          isActive: true,
        },
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        spot: {
          include: {
            belt: { select: { letter: true } },
            routes: {
              where: {
                isActive: true,
                schedule: { in: allowed },
              },
              select: { id: true, number: true },
            },
          },
        },
      },
    });

    const result: Record<string, any> = {};
    for (const a of assignments) {
      const route = a.spot.routes[0]; // A spot typically has one route
      result[a.userId] = {
        assignmentId: a.id,
        spotId: a.spotId,
        routeId: route?.id ?? null,
        routeNumber: route?.number ?? null,
        beltLetter: a.spot.belt.letter,
        spotNumber: a.spot.number,
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Get driver routes error:', error);
    res.status(500).json({ error: 'Failed to get driver routes' });
  }
});

// Assign a driver to a route's belt spot for a date
router.post('/assign-route', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { userId, routeId, date, force } = req.body;

    if (!userId || !routeId || !date) {
      return res.status(400).json({ error: 'userId, routeId, and date are required' });
    }

    // Look up route
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route || !route.isActive) {
      return res.status(400).json({ error: 'Route not found or inactive' });
    }

    if (!route.beltSpotId) {
      return res.status(400).json({ error: 'Route is not assigned to a belt spot' });
    }

    const targetDate = new Date(date);

    // Check if spot already has a different user
    const existingAssignment = await prisma.assignment.findUnique({
      where: { spotId_date: { spotId: route.beltSpotId, date: targetDate } },
      include: { user: { select: { id: true, name: true } } },
    });

    if (existingAssignment && existingAssignment.userId !== userId && !force) {
      return res.status(409).json({
        error: 'Spot already assigned',
        currentAssignee: existingAssignment.user.name,
        currentAssigneeId: existingAssignment.user.id,
      });
    }

    // Delete driver's existing assignment for this date on any other spot
    await prisma.assignment.deleteMany({
      where: {
        userId,
        date: targetDate,
        spotId: { not: route.beltSpotId },
      },
    });

    // Upsert assignment at route's spot
    const assignment = await prisma.assignment.upsert({
      where: { spotId_date: { spotId: route.beltSpotId, date: targetDate } },
      create: {
        spotId: route.beltSpotId,
        userId,
        date: targetDate,
        truckNumber: '',
        isOverride: true,
      },
      update: {
        userId,
        isOverride: true,
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Assign route error:', error);
    res.status(500).json({ error: 'Failed to assign route' });
  }
});

// Get swing drivers
router.get('/swing', authenticate, async (req, res) => {
  try {
    const swingDrivers = await prisma.user.findMany({
      where: { role: 'SWING', isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(swingDrivers);
  } catch (error) {
    console.error('Get swing drivers error:', error);
    res.status(500).json({ error: 'Failed to get swing drivers' });
  }
});

// Get person detail with balances and time off history
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Only high-access users or the user themselves can view details
    if (!['HIGHEST_MANAGER', 'OP_LEAD'].includes(req.user!.accessLevel) && req.user!.userId !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await ensureBalancesReset(id);

    const person = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        workSchedule: true,
        accessLevel: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
        vacationWeeks: true,
        vacationDays: true,
        personalDays: true,
        holidays: true,
        sickDays: true,
        sickDayCarryover: true,
        balanceResetDate: true,
        isActive: true,
      },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const used = await getUsedBalances(id, person.balanceResetDate);

    const timeOffs = await prisma.timeOff.findMany({
      where: { userId: id },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json({ ...person, usedBalances: used, timeOffs });
  } catch (error) {
    console.error('Get person detail error:', error);
    res.status(500).json({ error: 'Failed to get person detail' });
  }
});

// Create person (HIGHEST_MANAGER only)
router.post('/', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { email, password, name, phone, role, workSchedule, accessLevel, managerId } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        workSchedule,
        accessLevel,
        managerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person (HIGHEST_MANAGER only)
router.put('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const {
      name, phone, email, role, isActive, workSchedule,
      vacationWeeks, vacationDays, personalDays, holidays, sickDays,
      accessLevel, managerId,
    } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        role,
        isActive,
        workSchedule,
        vacationWeeks,
        vacationDays,
        personalDays,
        holidays,
        sickDays,
        accessLevel,
        managerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        workSchedule: true,
        vacationWeeks: true,
        vacationDays: true,
        personalDays: true,
        holidays: true,
        sickDays: true,
        sickDayCarryover: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Deactivate person (HIGHEST_MANAGER only)
router.delete('/:id', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Deactivate person error:', error);
    res.status(500).json({ error: 'Failed to deactivate person' });
  }
});

export default router;
