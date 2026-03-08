import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, requireAccessLevel, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';
import { prisma } from '../lib/prisma';
import { ensureBalancesReset, getUsedBalances } from '../utils/balance';
import { sendEmail } from '../utils/email';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const router = Router();

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
        isSuspended: isHighAccess ? true : false,
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

// Get driver routes — based on permanent route.driverId assignments
router.get('/driver-routes', authenticate, async (req, res) => {
  try {
    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
        driverId: { not: null },
        beltSpotId: { not: null },
      },
      include: {
        beltSpot: {
          include: {
            belt: { select: { letter: true } },
          },
        },
      },
    });

    const result: Record<string, any> = {};
    for (const route of routes) {
      if (route.driverId && route.beltSpot) {
        result[route.driverId] = {
          routeId: route.id,
          routeNumber: route.number,
          spotId: route.beltSpotId,
          beltLetter: route.beltSpot.belt.letter,
          spotNumber: route.beltSpot.number,
        };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Get driver routes error:', error);
    res.status(500).json({ error: 'Failed to get driver routes' });
  }
});

// Assign a driver permanently to a route
router.post('/assign-route', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { userId, routeId } = req.body;

    if (!userId || !routeId) {
      return res.status(400).json({ error: 'userId and routeId are required' });
    }

    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route || !route.isActive) {
      return res.status(400).json({ error: 'Route not found or inactive' });
    }

    // Check if another route already has this driver
    const existingRoute = await prisma.route.findFirst({
      where: { driverId: userId, isActive: true, id: { not: routeId } },
    });

    if (existingRoute) {
      // Clear driver from old route
      await prisma.route.update({
        where: { id: existingRoute.id },
        data: { driverId: null },
      });
    }

    // Set driver on route
    const updated = await prisma.route.update({
      where: { id: routeId },
      data: { driverId: userId },
    });

    res.json(updated);
  } catch (error) {
    console.error('Assign route error:', error);
    res.status(500).json({ error: 'Failed to assign route' });
  }
});

// Unassign a driver from their route
router.post('/unassign-route', authenticate, requireAccessLevel('OP_LEAD'), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await prisma.route.updateMany({
      where: { driverId: userId, isActive: true },
      data: { driverId: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unassign route error:', error);
    res.status(500).json({ error: 'Failed to unassign route' });
  }
});

// Get swing drivers (optionally with assignment info for a date)
router.get('/swing', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    const swingDrivers = await prisma.user.findMany({
      where: { role: 'SWING', isActive: true },
      select: {
        id: true,
        name: true,
        assignments: {
          where: date ? { date: new Date(date as string) } : { date: new Date(0) },
          select: {
            spot: {
              select: {
                number: true,
                belt: { select: { letter: true } },
                routes: {
                  where: { isActive: true },
                  select: { number: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = swingDrivers.map(d => ({
      id: d.id,
      name: d.name,
      assignedSpot: d.assignments[0]
        ? `${d.assignments[0].spot.belt.letter}${d.assignments[0].spot.number}${d.assignments[0].spot.routes[0] ? ` R:${d.assignments[0].spot.routes[0].number}` : ''}`
        : null,
    }));

    res.json(result);
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
        isSuspended: true,
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
    const { email, name, phone, role, workSchedule, accessLevel, managerId } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const user = await prisma.user.create({
      data: {
        email: email || null,
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

    // Check if email is being added to a user who didn't have one
    const existingUser = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true } });
    const isAddingEmail = email && !existingUser?.email;

    if (isAddingEmail) {
      // Check email isn't already taken
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

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

    // Auto-send invite when email is added for the first time
    if (isAddingEmail) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await prisma.inviteToken.create({
        data: { token, userId: id, expiresAt },
      });

      const inviter = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { name: true },
      });

      const inviteLink = `${APP_URL}/invite/accept?token=${token}`;

      sendEmail(
        [email],
        'You\'re invited to FedEx Truck Lineup',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to FedEx Truck Lineup, ${user.name}!</h2>
          <p>${inviter?.name || 'A manager'} has invited you to join the FedEx Truck Lineup scheduling system.</p>
          <p>Click the button below to set up your account and create your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4F0084; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">
              Set Up Your Account
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This invite link will expire in 48 hours.</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteLink}</p>
        </div>
        `
      );
    }

    res.json({ ...user, inviteSent: isAddingEmail });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Toggle suspend/unsuspend (HIGHEST_MANAGER only)
router.patch('/:id/suspend', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { isSuspended } = req.body;

    if (typeof isSuspended !== 'boolean') {
      return res.status(400).json({ error: 'isSuspended (boolean) is required' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended },
      select: { id: true, name: true, isSuspended: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Suspend person error:', error);
    res.status(500).json({ error: 'Failed to update suspension status' });
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
