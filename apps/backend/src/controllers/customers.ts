import { and, asc, count, desc, eq, like, or, sum } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/index.js'
import { customers, orders } from '../db/schema.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

// Get all customers with filtering and pagination
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page: pageStr = '1',
      limit: limitStr = '20',
    } = req.query as {
      search?: string
      sortBy?: string
      sortOrder?: string
      page?: string
      limit?: string
    }

    // Parse pagination parameters
    const page = parseInt(pageStr as string, 10)
    const limit = parseInt(limitStr as string, 10)

    // Build the where clause
    let whereClause: any = null
    if (search) {
      whereClause = or(
        like(customers.name, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(customers.phone, `%${search}%`)
      )
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Build the order clause
    let orderClause: any = null
    if (sortOrder.toLowerCase() === 'asc') {
      orderClause = asc(customers[sortBy as keyof typeof customers])
    } else {
      orderClause = desc(customers[sortBy as keyof typeof customers])
    }

    // Get the total count
    const countResult = await db
      .select({ count: count() })
      .from(customers)
      .where(whereClause || undefined)

    const total = Number(countResult[0].count)

    // Get the customers
    const customersList = await db.query.customers.findMany({
      where: whereClause,
      orderBy: orderClause,
      limit,
      offset,
    })

    res.status(200).json({
      success: true,
      count: customersList.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: customersList,
    })
  } catch (error) {
    next(error)
  }
}

// Get a single customer with their orders
export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the customer from the database
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    })

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`)
    }

    // Get the customer's orders
    const customerOrders = await db.query.orders.findMany({
      where: eq(orders.customerId, id),
      orderBy: desc(orders.createdAt),
      limit: 10, // Get only the most recent orders
    })

    // Get the total number of orders and total spent
    const stats = await db
      .select({
        totalOrders: count(orders.id),
        totalSpent: sum(orders.total).as('totalSpent'),
      })
      .from(orders)
      .where(and(eq(orders.customerId, id), eq(orders.status, 'completed')))

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        stats: {
          totalOrders: Number(stats[0].totalOrders),
          totalSpent: Number(stats[0].totalSpent) || 0,
        },
        recentOrders: customerOrders,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create a new customer
export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, address } = req.body

    // Validate input
    if (!name) {
      throw new BadRequestError('Name is required')
    }

    // Check if email is unique if provided
    if (email) {
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.email, email),
      })

      if (existingCustomer) {
        throw new BadRequestError(`Customer with email ${email} already exists`)
      }
    }

    // Create the customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name,
        email,
        phone,
        address,
      })
      .returning()

    res.status(201).json({
      success: true,
      data: newCustomer,
    })
  } catch (error) {
    next(error)
  }
}

// Update a customer
export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, email, phone, address } = req.body

    // Get the customer from the database
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    })

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`)
    }

    // Check if email is unique if changed
    if (email && email !== customer.email) {
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.email, email),
      })

      if (existingCustomer) {
        throw new BadRequestError(`Customer with email ${email} already exists`)
      }
    }

    // Prepare update values
    const updateValues: Partial<typeof customers.$inferInsert> = {}

    if (name !== undefined) updateValues.name = name
    if (email !== undefined) updateValues.email = email
    if (phone !== undefined) updateValues.phone = phone
    if (address !== undefined) updateValues.address = address

    // Update the customer
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning()

    res.status(200).json({
      success: true,
      data: updatedCustomer,
    })
  } catch (error) {
    next(error)
  }
}

// Delete a customer
export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the customer from the database
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    })

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`)
    }

    // Check if the customer has orders
    const customerOrders = await db.query.orders.findMany({
      where: eq(orders.customerId, id),
      limit: 1,
    })

    if (customerOrders.length > 0) {
      throw new BadRequestError('Cannot delete customer with associated orders')
    }

    // Delete the customer
    await db.delete(customers).where(eq(customers.id, id))

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}
