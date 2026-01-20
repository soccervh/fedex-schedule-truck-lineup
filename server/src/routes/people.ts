import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const router = Router();
const prisma = new PrismaClient();

// Get all people (managers only see all, drivers see limited)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const people = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: req.user!.role === 'MANAGER' ? true : false,
        role: true,
        homeArea: true,
        phone: req.user!.role === 'MANAGER' ? true : false,
      },
      orderBy: { name: 'asc' },
    });

    res.json(people);
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Failed to get people' });
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
        homeArea: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(swingDrivers);
  } catch (error) {
    console.error('Get swing drivers error:', error);
    res.status(500).json({ error: 'Failed to get swing drivers' });
  }
});

// Create person (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const { email, password, name, phone, role, homeArea } = req.body;

    if (!email || !password || !name || !role || !homeArea) {
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
        homeArea,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person (manager only)
router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name, phone, role, homeArea, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        role,
        homeArea,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Deactivate person (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res) => {
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
