import bcrypt from 'bcryptjs'
import { desc, eq } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

// Get all users
export const getUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all users, sorted by most recently created
    const usersList = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
    })

    // Return users without password
    const safeUsers = usersList.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...safeUser } = user
      return safeUser
    })

    res.status(200).json({
      success: true,
      count: safeUsers.length,
      data: safeUsers,
    })
  } catch (error) {
    next(error)
  }
}

// Get a single user
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`)
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user

    res.status(200).json({
      success: true,
      data: safeUser,
    })
  } catch (error) {
    next(error)
  }
}

// Create a new user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role = 'waitress', active = true } = req.body

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
        active,
      })
      .returning()

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = newUser

    res.status(201).json({
      success: true,
      data: safeUser,
    })
  } catch (error) {
    next(error)
  }
}

// Update a user
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, email, role, active, password } = req.body

    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`)
    }

    // Prepare update values
    const updateValues: Partial<typeof users.$inferInsert> = {}

    if (name !== undefined) updateValues.name = name
    if (email !== undefined) updateValues.email = email
    if (role !== undefined) updateValues.role = role
    if (active !== undefined) updateValues.active = active

    // If password is provided, hash it
    if (password) {
      updateValues.password = await bcrypt.hash(password, 10)
    }

    // Update the user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = updatedUser

    res.status(200).json({
      success: true,
      data: safeUser,
    })
  } catch (error) {
    next(error)
  }
}

// Delete a user
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`)
    }

    // Delete the user
    await db.delete(users).where(eq(users.id, id))

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}
