import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

// Global error handling middleware
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack })

  // Default error response
  let statusCode = 500
  let message = 'Internal server error'
  let errorDetails: any = null

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation error'
    errorDetails = err.message
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    errorDetails = errorDetails || err.stack
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errorDetails ? { details: errorDetails } : {}),
  })
}

// 404 handler middleware
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
}
