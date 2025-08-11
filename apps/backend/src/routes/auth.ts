import express, { type Router } from 'express'
import { forgotPassword, getMe, login, register, resetPassword } from '../controllers/auth.js'
import { authenticate } from '../middleware/auth.js'

const router: Router = express.Router()

// Public routes
router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Protected routes
router.get('/me', authenticate, getMe)

export default router
