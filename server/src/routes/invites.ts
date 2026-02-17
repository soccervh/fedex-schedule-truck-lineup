import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest, requireAccessLevel } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../utils/email';

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Send invite — HIGHEST_MANAGER only
router.post('/', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, role, homeArea, workSchedule, accessLevel, managerId } = req.body;

    if (!name || !email || !role || !homeArea || !accessLevel) {
      return res.status(400).json({ error: 'name, email, role, homeArea, and accessLevel are required' });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Create user without password, isActive: false
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role,
        homeArea,
        workSchedule: workSchedule || undefined,
        accessLevel,
        managerId: managerId || null,
        isActive: false,
      },
    });

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await prisma.inviteToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Get inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    const inviteLink = `${APP_URL}/invite/accept?token=${token}`;

    // Send invite email
    await sendEmail(
      [email],
      'You\'re invited to FedEx Truck Lineup',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FedEx Truck Lineup, ${name}!</h2>
        <p>${inviter?.name || 'A manager'} has invited you to join the FedEx Truck Lineup scheduling system.</p>
        <p>Click the button below to set up your account and create your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4F0084; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Set Up Your Account
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invite link will expire in 48 hours.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteLink}</p>
      </div>
      `
    );

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        homeArea: user.homeArea,
        accessLevel: user.accessLevel,
      },
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// List pending invites — HIGHEST_MANAGER only
router.get('/pending', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        isActive: false,
        password: null,
      },
      include: {
        inviteTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const result = pendingUsers.map((user) => {
      const latestToken = user.inviteTokens[0];
      const inviteExpired = latestToken
        ? new Date() > latestToken.expiresAt
        : true;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessLevel: user.accessLevel,
        createdAt: user.createdAt,
        inviteExpired,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('List pending invites error:', error);
    res.status(500).json({ error: 'Failed to list pending invites' });
  }
});

// Resend invite — HIGHEST_MANAGER only
router.post('/:id/resend', authenticate, requireAccessLevel('HIGHEST_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isActive) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await prisma.inviteToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Get inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    const inviteLink = `${APP_URL}/invite/accept?token=${token}`;

    // Send invite email
    await sendEmail(
      [user.email],
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
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteLink}</p>
      </div>
      `
    );

    res.json({ message: 'Invite resent successfully' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

export default router;
