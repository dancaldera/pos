import { drizzle } from 'drizzle-orm/node-postgres'
import pkg from 'pg'

const { Pool } = pkg

import { config } from '../config/index.js'
import * as schema from './schema.js'

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
})

// Create a Drizzle instance with the connection and schema
export const db = drizzle(pool, { schema })
