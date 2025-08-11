import { eq } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { db } from '../db/index.js'
import { settings } from '../db/schema.js'
import { deleteFile, uploadFile } from '../services/storage.js'
import { BadRequestError } from '../utils/errors.js'

// Configure multer for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new BadRequestError('Only image files are allowed') as Error)
    }
  },
})

// Get system settings
export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch the settings (there should only be one row)
    const settingsData = await db.select().from(settings).limit(1)

    if (settingsData.length === 0) {
      // If no settings exist, return default values
      return res.status(200).json({
        success: true,
        data: {
          businessName: 'My Business',
          address: '',
          phone: '',
          email: '',
          taxRate: 0,
          currency: 'USD',
          logoUrl: null,
          receiptFooter: 'Thank you for your business!',
        },
      })
    }

    res.status(200).json({
      success: true,
      data: settingsData[0],
    })
  } catch (error) {
    next(error)
  }
}

// Update settings
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessName, address, phone, email, taxRate, currency, receiptFooter, removeLogo } =
      req.body
    // Validate required fields
    if (!businessName) {
      throw new BadRequestError('Business name is required')
    }

    // Get current settings
    const currentSettings = await db.select().from(settings).limit(1)

    // Handle logo upload or removal
    let logoUrl = currentSettings.length > 0 ? currentSettings[0].logoUrl : null

    if (removeLogo === 'true' && logoUrl) {
      // Delete the current logo
      await deleteFile(logoUrl)
      logoUrl = null
    } else if (req.file) {
      // Delete the old logo if it exists
      if (logoUrl) {
        await deleteFile(logoUrl)
      }
      // Upload the new logo
      logoUrl = await uploadFile(req.file, 'settings')
    }

    // Prepare values
    const currencyValue = currency || 'USD'

    // Parse taxRate as a number
    let parsedTaxRate = 0
    if (taxRate !== undefined) {
      // Convert string to number and handle potential errors
      parsedTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate
      if (Number.isNaN(parsedTaxRate)) parsedTaxRate = 0
    }

    // Create settings values object
    const settingsValues = {
      businessName,
      address: address || null,
      phone: phone || null,
      email: email || null,
      taxRate: parsedTaxRate.toString(), // Convert to string for numeric field
      currency: currencyValue,
      logoUrl: logoUrl
        ? `${process.env.R2_PUBLIC_URL}/settings/${logoUrl.split('/').pop()?.split('?')[0]}`
        : null,
      receiptFooter: receiptFooter || null,
      updatedAt: new Date(),
    }

    let result: any = null

    if (currentSettings.length === 0) {
      // If no settings exist, insert new row
      ;[result] = await db.insert(settings).values(settingsValues).returning()
    } else {
      // Otherwise update existing settings
      const settingsId = currentSettings[0].id

      // Use the eq import from drizzle-orm for the comparison
      ;[result] = await db
        .update(settings)
        .set(settingsValues)
        .where(eq(settings.id, settingsId))
        .returning()
    }

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
