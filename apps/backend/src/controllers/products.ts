import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { products, categories, inventoryTransactions } from '../db/schema.js';
import { eq, desc, asc, like, sql, and, or } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { uploadFile, deleteFile } from '../services/storage.js';
import multer from 'multer';

// Configure multer for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Only image files are allowed') as any);
    }
  },
});

// Get all products with filtering and pagination
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page: pageStr = '1',
      limit: limitStr = '20',
      active,
      lowStock,
    } = req.query as any;
    
    // Parse pagination parameters
    const page = parseInt(pageStr as string, 10);
    const limit = parseInt(limitStr as string, 10);

    // Build the where clause
    let whereClause = sql`1 = 1`;

    if (categoryId) {
      whereClause = sql`${whereClause} AND ${products.categoryId} = ${categoryId}`;
    }

    if (search) {
      whereClause = sql`${whereClause} AND (
        ${products.name} LIKE ${`%${search}%`} OR
        ${products.description} LIKE ${`%${search}%`} OR
        ${products.sku} LIKE ${`%${search}%`} OR
        ${products.barcode} LIKE ${`%${search}%`}
      )`;
    }

    if (active !== undefined) {
      const isActive = active === 'true';
      whereClause = sql`${whereClause} AND ${products.active} = ${isActive}`;
    }

    if (lowStock === 'true') {
      whereClause = sql`${whereClause} AND ${products.stock} <= ${products.lowStockAlert} AND ${products.lowStockAlert} IS NOT NULL`;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build the order clause
    let orderClause;
    // Special case for category sorting
    if (sortBy === 'category') {
      if (sortOrder.toLowerCase() === 'asc') {
        orderClause = asc(categories.name);
      } else {
        orderClause = desc(categories.name);
      }
    } else {
      if (sortOrder.toLowerCase() === 'asc') {
        orderClause = asc(products[sortBy as keyof typeof products] as any);
      } else {
        orderClause = desc(products[sortBy as keyof typeof products] as any);
      }
    }

    // Get the total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(whereClause);

    const total = Number(countResult[0].count);

    // Get the products with their categories
    const productsList = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset)
      .then(results => {
        // Transform the result to include category information
        return results.map(({ product, categoryName }) => ({
          ...product,
          category: product.categoryId ? { id: product.categoryId, name: categoryName } : null,
        }));
      });

    res.status(200).json({
      success: true,
      count: productsList.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: productsList,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single product
export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get the product from the database
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .then(res => res[0] || null);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new product
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      price,
      cost,
      sku,
      barcode,
      categoryId,
      stock = 0,
      lowStockAlert,
      active = true,
    } = req.body;

    // Validate input
    if (!name || price === undefined) {
      throw new BadRequestError('Name and price are required');
    }

    // Check if the category exists if provided
    if (categoryId) {
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1)
        .then(res => res[0] || null);

      if (!category) {
        throw new BadRequestError(`Category with ID ${categoryId} not found`);
      }
    }

    // Check if SKU or barcode already exists
    if (sku && sku.trim() !== '') {
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku))
        .limit(1)
        .then(res => res[0] || null);

      if (existingProduct) {
        throw new BadRequestError(`Product with SKU ${sku} already exists`);
      }
    }

    if (barcode && barcode.trim() !== '') {
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.barcode, barcode))
        .limit(1)
        .then(res => res[0] || null);

      if (existingProduct) {
        throw new BadRequestError(`Product with barcode ${barcode} already exists`);
      }
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadFile(req.file, 'products');
    }

    // Handle variants data
    const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;
    let variants = null;
    
    if (hasVariants && req.body.variants) {
      try {
        // Parse the variants JSON string
        variants = JSON.parse(req.body.variants);
        
        // Validate that variants is an array
        if (!Array.isArray(variants)) {
          variants = null;
        }
      } catch (error) {
        console.error('Error parsing variants:', error);
      }
    }
    
    // Prepare values with null handling for empty strings
    const productValues = {
      name,
      description: description || null,
      price,
      cost: cost || null,
      sku: sku || null,
      barcode: barcode || null,
      categoryId: categoryId || null,
      stock,
      lowStockAlert: lowStockAlert || null,
      active,
      imageUrl: imageUrl ? `${process.env.R2_PUBLIC_URL}/products/${imageUrl.split('/').pop()?.split('?')[0]}` : null,
      hasVariants,
      variants,
    };

    // Create the product
    const [newProduct] = await db.insert(products).values(productValues).returning();

    // Create inventory transaction if stock > 0
    if (stock > 0) {
      await db.insert(inventoryTransactions).values({
        productId: newProduct.id,
        quantity: stock,
        type: 'initial',
        notes: 'Initial stock',
        userId: req.user!.id,
      });
    }

    // Get the product data
    const productWithCategory = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, newProduct.id))
      .limit(1)
      .then(res => {
        if (res.length === 0) return null;
        const { product, categoryName } = res[0];
        return {
          ...product,
          category: product.categoryId ? { id: product.categoryId, name: categoryName } : null,
        };
      });

    res.status(201).json({
      success: true,
      data: productWithCategory,
    });
  } catch (error) {
    next(error);
  }
};

// Update a product
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      cost,
      sku,
      barcode,
      categoryId,
      stock,
      lowStockAlert,
      active,
      removeImage,
    } = req.body;

    // Get the product from the database
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .then(res => res[0] || null);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Check if the category exists if provided
    if (categoryId) {
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1)
        .then(res => res[0] || null);

      if (!category) {
        throw new BadRequestError(`Category with ID ${categoryId} not found`);
      }
    }

    // Check if SKU or barcode already exists for another product
    if (sku !== undefined && sku !== product.sku) {
      // Handle empty strings as null
      if (sku === '' || sku === null) {
        // It's fine, we're just removing the SKU
      } else {
        const existingProduct = await db
          .select()
          .from(products)
          .where(eq(products.sku, sku))
          .limit(1)
          .then(res => res[0] || null);

        if (existingProduct && existingProduct.id !== id) {
          throw new BadRequestError(`Product with SKU ${sku} already exists`);
        }
      }
    }

    if (barcode !== undefined && barcode !== product.barcode) {
      // Handle empty strings as null
      if (barcode === '' || barcode === null) {
        // It's fine, we're just removing the barcode
      } else {
        const existingProduct = await db
          .select()
          .from(products)
          .where(eq(products.barcode, barcode))
          .limit(1)
          .then(res => res[0] || null);

        if (existingProduct && existingProduct.id !== id) {
          throw new BadRequestError(`Product with barcode ${barcode} already exists`);
        }
      }
    }

    // Handle stock change
    if (stock !== undefined && stock !== product.stock) {
      // Create inventory transaction
      await db.insert(inventoryTransactions).values({
        productId: product.id,
        quantity: stock - product.stock,
        type: 'adjustment',
        notes: 'Manual stock adjustment',
        userId: req.user!.id,
      });
    }

    // Handle image upload or removal
    let imageUrl = product.imageUrl;

    if (removeImage === 'true' && product.imageUrl) {
      // Delete the current image
      await deleteFile(product.imageUrl);
      imageUrl = null;
    } else if (req.file) {
      // Delete the old image if it exists
      if (product.imageUrl) {
        await deleteFile(product.imageUrl);
      }
      // Upload the new image
      imageUrl = await uploadFile(req.file, 'products');
    }

    // Handle variants data
    const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;
    let variants = null;
    
    if (hasVariants && req.body.variants) {
      try {
        // Parse the variants JSON string
        variants = JSON.parse(req.body.variants);
        
        // Validate that variants is an array
        if (!Array.isArray(variants)) {
          variants = null;
        }
      } catch (error) {
        console.error('Error parsing variants:', error);
      }
    }
    
    // Prepare update values
    const updateValues: any = {};

    if (name !== undefined) updateValues.name = name;
    if (description !== undefined) updateValues.description = description || null;
    if (price !== undefined) updateValues.price = price;
    if (cost !== undefined) updateValues.cost = cost || null;
    if (sku !== undefined) updateValues.sku = sku === '' ? null : sku;
    if (barcode !== undefined) updateValues.barcode = barcode === '' ? null : barcode;
    if (categoryId !== undefined) updateValues.categoryId = categoryId || null;
    if (stock !== undefined) updateValues.stock = stock;
    if (lowStockAlert !== undefined) updateValues.lowStockAlert = lowStockAlert || null;
    if (active !== undefined) updateValues.active = active === true || active === 'true';
    updateValues.imageUrl = imageUrl
      ? `${process.env.R2_PUBLIC_URL}/products/${imageUrl.split('/').pop()?.split('?')[0]}`
      : null;
    
    // Always update variants related fields if hasVariants is specified
    if (req.body.hasVariants !== undefined) {
      updateValues.hasVariants = hasVariants;
      updateValues.variants = variants;
    } else if (variants !== null) {
      // If only variants were updated without changing hasVariants status
      updateValues.variants = variants;
    }

    // Update the product
    const [updatedProduct] = await db
      .update(products)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    // Get the product data with category
    const productWithCategory = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, updatedProduct.id))
      .limit(1)
      .then(res => {
        if (res.length === 0) return null;
        const { product, categoryName } = res[0];
        return {
          ...product,
          category: product.categoryId ? { id: product.categoryId, name: categoryName } : null,
        };
      });

    res.status(200).json({
      success: true,
      data: productWithCategory,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a product
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get the product from the database
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .then(res => res[0] || null);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Delete the product image if it exists
    if (product.imageUrl) {
      await deleteFile(product.imageUrl);
    }

    // Delete the product
    await db.delete(products).where(eq(products.id, id));

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
