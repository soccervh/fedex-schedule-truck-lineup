import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword } from '../utils/password';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account not yet activated. Check your email for the invite link.' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, accessLevel: user.accessLevel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        homeArea: user.homeArea,
        accessLevel: user.accessLevel,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        homeArea: true,
        phone: true,
        accessLevel: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Validate invite token (public)
router.get('/validate-invite', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.usedAt) {
      return res.status(410).json({ error: 'Invite has already been used' });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(410).json({ error: 'Invite has expired' });
    }

    res.json({ user: invite.user });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ error: 'Failed to validate invite' });
  }
});

// Accept invite and set password (public)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, phone } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.usedAt) {
      return res.status(410).json({ error: 'Invite has already been used' });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(410).json({ error: 'Invite has expired' });
    }

    const hashedPassword = await hashPassword(password);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: invite.userId },
        data: {
          password: hashedPassword,
          phone: phone || invite.user.phone,
          isActive: true,
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return user;
    });

    const jwtToken = jwt.sign(
      { userId: updatedUser.id, role: updatedUser.role, accessLevel: updatedUser.accessLevel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        homeArea: updatedUser.homeArea,
        accessLevel: updatedUser.accessLevel,
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

export default router;
