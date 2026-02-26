import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword } from '../utils/password';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../utils/email';

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

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Forgot password — sends reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking whether email exists
    if (!user || !user.isActive) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

    sendEmail(
      [email],
      'Reset your password — FedEx Truck Lineup',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your FedEx Truck Lineup account.</p>
        <p>Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4F0084; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${resetLink}</p>
      </div>
      `
    );

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
