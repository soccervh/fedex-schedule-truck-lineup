import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface AuthPayload {
  userId: string;
  role: 'MANAGER' | 'DRIVER' | 'SWING' | 'CSA' | 'HANDLER';
}

const VALID_ROLES = ['MANAGER', 'DRIVER', 'SWING', 'CSA', 'HANDLER'] as const;

function isValidPayload(payload: unknown): payload is AuthPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const obj = payload as Record<string, unknown>;
  return (
    typeof obj.userId === 'string' &&
    obj.userId.length > 0 &&
    typeof obj.role === 'string' &&
    VALID_ROLES.includes(obj.role as typeof VALID_ROLES[number])
  );
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isValidPayload(decoded)) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireManager(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}
