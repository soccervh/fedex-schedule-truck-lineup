import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export type AccessLevel = 'HIGHEST_MANAGER' | 'OP_LEAD' | 'TRUCK_MOVER' | 'EMPLOYEE';

// Ordered from highest to lowest access
const ACCESS_LEVEL_HIERARCHY: AccessLevel[] = [
  'HIGHEST_MANAGER',
  'OP_LEAD',
  'TRUCK_MOVER',
  'EMPLOYEE',
];

export interface AuthPayload {
  userId: string;
  role: string;
  accessLevel: AccessLevel;
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
    VALID_ROLES.includes(obj.role as typeof VALID_ROLES[number]) &&
    typeof obj.accessLevel === 'string' &&
    ACCESS_LEVEL_HIERARCHY.includes(obj.accessLevel as AccessLevel)
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

export function requireAccessLevel(minLevel: AccessLevel) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userIndex = ACCESS_LEVEL_HIERARCHY.indexOf(req.user.accessLevel);
    const requiredIndex = ACCESS_LEVEL_HIERARCHY.indexOf(minLevel);
    // Lower index = higher access
    if (userIndex > requiredIndex) {
      return res.status(403).json({ error: `${minLevel} access or higher required` });
    }
    next();
  };
}

// Backward compat alias
export const requireManager = requireAccessLevel('HIGHEST_MANAGER');
