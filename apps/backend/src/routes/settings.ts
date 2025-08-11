import express, { Router } from 'express'
import { getSettings, updateSettings, upload } from '../controllers/settings.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router: Router = express.Router()

// All routes in this file require authentication
router.use(authenticate)

// Get settings - accessible by all authenticated users
router.get('/', getSettings)

// Update settings - admin only
router.put('/', authorize('admin'), upload.single('logo'), updateSettings)

export default router
