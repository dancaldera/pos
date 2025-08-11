import express, { Router } from 'express';
import { register, login, getMe, forgotPassword, resetPassword } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router: Router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
