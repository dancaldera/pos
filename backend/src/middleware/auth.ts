import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Extend the Express Request interface to include the user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Auth middleware that verifies the JWT token
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    // Check if the user exists and is active
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });

    if (!user || !user.active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Attach the user to the request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};
