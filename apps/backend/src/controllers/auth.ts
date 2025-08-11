import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { emailService } from '../services/email.js'
import { BadRequestError, UnauthorizedError } from '../utils/errors.js'

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role = 'waitress' } = req.body

    // Validate input
    if (!name || !email || !password) {
      throw new BadRequestError('Name, email, and password are required')
    }

    // Check if the email is already registered
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      throw new BadRequestError('Email already registered')
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role as 'admin' | 'manager' | 'waitress',
      })
      .returning()

    // Generate a JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      Buffer.from(config.jwt.secret, 'utf-8'),
      { expiresIn: '1d' }
    )

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
    })
  } catch (error) {
    next(error)
  }
}

// Login a user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      throw new BadRequestError('Email and password are required')
    }

    // Check if the user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check if the user is active
    if (!user.active) {
      throw new UnauthorizedError('User account is deactivated')
    }

    // Check if the password is correct
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      Buffer.from(config.jwt.secret, 'utf-8'),
      { expiresIn: '1d' }
    )

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
    })
  } catch (error) {
    next(error)
  }
}

// Get the authenticated user
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user?.id || ''),
    })

    if (!user) {
      throw new UnauthorizedError('User not found')
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
    })
  } catch (error) {
    next(error)
  }
}

// Forgot password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body

    // Validate input
    if (!email) {
      throw new BadRequestError('Email is required')
    }

    // Check if the user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      // Don't reveal if the email exists or not for security reasons
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
      return
    }

    // Check if the user is active
    if (!user.active) {
      // Don't reveal if the account is deactivated
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
      return
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save the reset token to the database
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Send the password reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken)

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    next(error)
  }
}

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body

    // Validate input
    if (!token || !password) {
      throw new BadRequestError('Token and password are required')
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long')
    }

    // Find user with valid reset token
    const user = await db.query.users.findFirst({
      where: and(eq(users.resetToken, token), gt(users.resetTokenExpiry, new Date())),
    })

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token')
    }

    // Check if the user is active
    if (!user.active) {
      throw new UnauthorizedError('User account is deactivated')
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update the user's password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    next(error)
  }
}
