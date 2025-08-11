import { Request, Response, NextFunction } from 'express'
import { db } from '../db/index.js'
import { categories, products } from '../db/schema.js'
import { eq, desc, asc, like, count, sql } from 'drizzle-orm'
import { NotFoundError, BadRequestError } from '../utils/errors.js'

// Get all categories with filtering and pagination
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page: pageStr = '1',
      limit: limitStr = '50',
    } = req.query as any

    // Parse pagination parameters
    const page = parseInt(pageStr as string, 10)
    const limit = parseInt(limitStr as string, 10)

    // Build the where clause
    let whereClause
    if (search) {
      whereClause = like(categories.name, `%${search}%`)
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Build the order clause
    let orderClause
    if (sortOrder.toLowerCase() === 'asc') {
      orderClause = asc(categories[sortBy as keyof typeof categories] as any)
    } else {
      orderClause = desc(categories[sortBy as keyof typeof categories] as any)
    }

    // Get the categories with product counts
    const categoriesList = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: count(products.id).as('productCount'),
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .where(whereClause || sql`1 = 1`)
      .groupBy(categories.id)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset)

    // Get the total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(categories)
      .where(whereClause || sql`1 = 1`)

    const total = Number(countResult[0].count)

    res.status(200).json({
      success: true,
      count: categoriesList.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: categoriesList,
    })
  } catch (error) {
    next(error)
  }
}

// Get a single category with its products
export const getCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the category from the database
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    })

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`)
    }

    // Get the category's products
    const categoryProducts = await db.query.products.findMany({
      where: eq(products.categoryId, id),
      orderBy: asc(products.name),
    })

    res.status(200).json({
      success: true,
      data: {
        ...category,
        products: categoryProducts,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create a new category
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body

    // Validate input
    if (!name) {
      throw new BadRequestError('Name is required')
    }

    // Check if the category already exists
    const existingCategory = await db.query.categories.findFirst({
      where: eq(categories.name, name),
    })

    if (existingCategory) {
      throw new BadRequestError(`Category with name ${name} already exists`)
    }

    // Create the category
    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        description,
      })
      .returning()

    res.status(201).json({
      success: true,
      data: newCategory,
    })
  } catch (error) {
    next(error)
  }
}

// Update a category
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    // Get the category from the database
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    })

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`)
    }

    // Check if the new name already exists for another category
    if (name && name !== category.name) {
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.name, name),
      })

      if (existingCategory && existingCategory.id !== id) {
        throw new BadRequestError(`Category with name ${name} already exists`)
      }
    }

    // Prepare update values
    const updateValues: any = {}

    if (name !== undefined) updateValues.name = name
    if (description !== undefined) updateValues.description = description

    // Update the category
    const [updatedCategory] = await db
      .update(categories)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning()

    res.status(200).json({
      success: true,
      data: updatedCategory,
    })
  } catch (error) {
    next(error)
  }
}

// Delete a category
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Get the category from the database
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    })

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`)
    }

    // Check if the category has products
    const categoryProducts = await db.query.products.findMany({
      where: eq(products.categoryId, id),
    })

    if (categoryProducts.length > 0) {
      throw new BadRequestError(
        `Cannot delete category with associated products (${categoryProducts.length} found)`
      )
    }

    // Delete the category
    await db.delete(categories).where(eq(categories.id, id))

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (error) {
    next(error)
  }
}
