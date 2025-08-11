import dotenv from 'dotenv'
import type { Config } from 'drizzle-kit'

// Load environment variables from .env file
dotenv.config()

if (!process.env.DB_HOST) {
  throw new Error('DB_HOST environment variable is required')
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'database',
  },
} satisfies Config
