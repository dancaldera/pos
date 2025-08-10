import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { config } from '../config/index.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { eq } from 'drizzle-orm';

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role = 'waitress' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      throw new BadRequestError('Name, email, and password are required');
    }

    // Check if the email is already registered
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: role as any, // Cast to any to allow the role value
    }).returning();

    // Generate a JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      Buffer.from(config.jwt.secret, 'utf-8'),
      { expiresIn: '1d' }
    );

    // Return the user and token
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login a user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    // Check if the user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if the user is active
    if (!user.active) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Check if the password is correct
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      Buffer.from(config.jwt.secret, 'utf-8'),
      { expiresIn: '1d' }
    );

    // Return the user and token
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get the authenticated user
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Return the user
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
