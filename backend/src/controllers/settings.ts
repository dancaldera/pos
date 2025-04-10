import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { uploadFile, deleteFile } from '../services/storage.js';
import multer from 'multer';

// Configure multer for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
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

// Get system settings
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch the settings (there should only be one row)
    const settingsData = await db.select().from(settings).limit(1);

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
      });
    }

    res.status(200).json({
      success: true,
      data: settingsData[0],
    });
  } catch (error) {
    next(error);
  }
};

// Update settings
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Request body:', req.body);
    
    const {
      businessName,
      address,
      phone,
      email,
      taxRate,
      currency,
      receiptFooter,
      removeLogo,
    } = req.body;
    
    console.log('Currency from request:', currency);

    // Validate required fields
    if (!businessName) {
      throw new BadRequestError('Business name is required');
    }

    // Get current settings
    const currentSettings = await db.select().from(settings).limit(1);
    
    // Handle logo upload or removal
    let logoUrl = currentSettings.length > 0 ? currentSettings[0].logoUrl : null;

    if (removeLogo === 'true' && logoUrl) {
      // Delete the current logo
      await deleteFile(logoUrl);
      logoUrl = null;
    } else if (req.file) {
      // Delete the old logo if it exists
      if (logoUrl) {
        await deleteFile(logoUrl);
      }
      // Upload the new logo
      logoUrl = await uploadFile(req.file, 'settings');
    }

    // Prepare values
    const currencyValue = currency || 'USD';
    console.log('Setting currency value to:', currencyValue);
    
    // Parse taxRate as a number
    let parsedTaxRate = 0;
    if (taxRate !== undefined) {
      // Convert string to number and handle potential errors
      parsedTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
      if (isNaN(parsedTaxRate)) parsedTaxRate = 0;
    }
    console.log('Parsed tax rate:', parsedTaxRate);
    
    // Create settings values object
    const settingsValues = {
      businessName,
      address: address || null,
      phone: phone || null,
      email: email || null,
      taxRate: parsedTaxRate.toString(), // Convert to string for numeric field
      currency: currencyValue,
      logoUrl,
      receiptFooter: receiptFooter || null,
      updatedAt: new Date(),
    };
    
    console.log('Final settings values:', settingsValues);

    let result;

    if (currentSettings.length === 0) {
      // If no settings exist, insert new row
      [result] = await db.insert(settings).values(settingsValues).returning();
    } else {
      // Otherwise update existing settings
      const settingsId = currentSettings[0].id;
      console.log('Updating settings with ID:', settingsId);
      
      // Use the eq import from drizzle-orm for the comparison
      [result] = await db
        .update(settings)
        .set(settingsValues)
        .where(eq(settings.id, settingsId))
        .returning();
    }

    console.log('Result from database:', result);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};