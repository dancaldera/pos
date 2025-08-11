# Offline-First POS System: Step-by-Step Implementation Guide

## Prerequisites & Current State Analysis

### Current Monorepo Structure
- **Root**: pnpm monorepo with coordinated scripts
- **Frontend**: React + TypeScript + Vite + Tauri 2.0 (port 3000)
- **Backend**: Express + TypeScript + PostgreSQL + Drizzle ORM (port 8000)
- **Shared**: Common types and utilities package
- **Tools**: Development and build scripts

### Existing Dependencies Analysis
- ✅ **Tauri 2.0** already configured (`@tauri-apps/api: ^2.5.0`, `@tauri-apps/cli: ^2.5.0`)
- ✅ **TypeScript** ecosystem fully configured
- ✅ **Drizzle ORM** with PostgreSQL schema defined
- ✅ **Zustand** for state management
- ❌ **Tauri SQL Plugin** - needs installation
- ❌ **SQLite dependencies** - needs installation

---

## PHASE 1: Foundation Setup (Week 1-2)

### Step 1.1: Install Tauri SQL Plugin and Dependencies

#### 1.1.1 Install Frontend Dependencies
```bash
# Navigate to project root
cd /Users/danielcaldera/Documents/Desarrollo/Daniel/pos

# Add Tauri SQL plugin to frontend
pnpm --filter frontend add @tauri-apps/plugin-sql

# Add supporting libraries
pnpm --filter frontend add uuid date-fns
pnpm --filter frontend add -D @types/uuid

# Add Rust SQL plugin
cd apps/frontend/src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add uuid --features v4
cargo add serde_json
```

#### 1.1.2 Update Tauri Configuration
**File: `apps/frontend/src-tauri/src/lib.rs`**
```rust
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // Add migrations here as we create them
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pos.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 1.1.3 Update Tauri Permissions
**File: `apps/frontend/src-tauri/capabilities/default.json`**
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "log:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close"
  ]
}
```

### Step 1.2: Create SQLite Schema Matching PostgreSQL

#### 1.2.1 Create Database Schema Files
**Create: `apps/frontend/src/db/schema.ts`**
```typescript
// SQLite schema mirroring PostgreSQL structure
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  // Sync metadata
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSynced?: string
  versionVector?: string
  isDeleted: boolean
}

export interface User extends BaseEntity {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'waitress'
  active: boolean
  resetToken?: string
  resetTokenExpiry?: string
}

export interface Category extends BaseEntity {
  name: string
  description?: string
}

export interface Product extends BaseEntity {
  name: string
  description?: string
  price: number
  cost?: number
  sku?: string
  barcode?: string
  categoryId?: string
  imageUrl?: string
  stock: number
  lowStockAlert?: number
  active: boolean
  hasVariants: boolean
  variants?: string[]
}

export interface Customer extends BaseEntity {
  name: string
  email?: string
  phone?: string
  address?: string
}

export interface Order extends BaseEntity {
  orderNumber: number
  customerId?: string
  userId: string
  status: 'pending' | 'completed' | 'cancelled'
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  paymentStatus: 'paid' | 'unpaid' | 'partial'
  paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'transfer'
}

export interface OrderItem extends BaseEntity {
  orderId: string
  productId?: string
  productName: string
  variant?: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

// Sync-specific tables
export interface SyncLog {
  id: string
  tableName: string
  entityId: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  syncStatus: 'pending' | 'synced' | 'conflict'
  createdAt: string
  errorMessage?: string
}

export interface SyncConflict {
  id: string
  tableName: string
  entityId: string
  localData: string // JSON
  remoteData: string // JSON
  createdAt: string
  resolved: boolean
}
```

#### 1.2.2 Create Database Connection Manager
**Create: `apps/frontend/src/db/connection.ts`**
```typescript
import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:pos.db')
    await initializeSchema()
  }
  return db
}

async function initializeSchema(): Promise<void> {
  const database = db!
  
  // Create base tables with sync metadata
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'waitress',
      active BOOLEAN NOT NULL DEFAULT 1,
      reset_token TEXT,
      reset_token_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2),
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      category_id TEXT REFERENCES categories(id),
      image_url TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_alert INTEGER,
      active BOOLEAN NOT NULL DEFAULT 1,
      has_variants BOOLEAN NOT NULL DEFAULT 0,
      variants TEXT, -- JSON array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      subtotal DECIMAL(10,2) NOT NULL,
      tax DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      notes TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      product_name TEXT NOT NULL,
      variant TEXT,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      last_synced DATETIME,
      version_vector TEXT,
      is_deleted BOOLEAN DEFAULT 0
    )
  `)

  // Sync management tables
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      local_data TEXT,
      remote_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT 0
    )
  `)

  // Create indexes for performance
  await database.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  await database.execute('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)')
  await database.execute('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)')
  await database.execute('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)')
  await database.execute('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)')
  await database.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status)')
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close()
    db = null
  }
}
```

### Step 1.3: Test Database Setup

#### 1.3.1 Create Test Component
**Create: `apps/frontend/src/components/DatabaseTest.tsx`**
```typescript
import React, { useEffect, useState } from 'react'
import { getDatabase } from '../db/connection'

export default function DatabaseTest() {
  const [status, setStatus] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testDatabase()
  }, [])

  const testDatabase = async () => {
    try {
      const db = await getDatabase()
      
      // Test basic query
      const result = await db.select(
        'SELECT name FROM sqlite_master WHERE type="table"'
      )
      
      setStatus(`Database initialized successfully. Tables: ${result.length}`)
      console.log('Database tables:', result)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      setStatus('Database initialization failed')
    }
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">Database Status</h3>
      <p className={error ? 'text-red-600' : 'text-green-600'}>
        {status}
      </p>
      {error && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
    </div>
  )
}
```

#### 1.3.2 Add Test to App
**Update: `apps/frontend/src/App.tsx`**
```typescript
import DatabaseTest from './components/DatabaseTest'

// Add this temporarily to your main component to test
function App() {
  return (
    <div>
      {/* Existing app content */}
      <DatabaseTest />
    </div>
  )
}
```

### Step 1.4: Test the Setup

```bash
# Test Tauri development mode with SQLite
pnpm tauri:dev

# Verify database initialization in the Tauri app
# Check browser console for database table creation logs
```

---

## PHASE 2: Data Layer Abstraction (Week 3-4)

### Step 2.1: Create Repository Interfaces

#### 2.1.1 Base Repository Interface
**Create: `apps/frontend/src/repositories/base/types.ts`**
```typescript
export interface BaseRepository<T> {
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  findById(id: string): Promise<T | null>
  findAll(filters?: Record<string, any>): Promise<T[]>
  count(filters?: Record<string, any>): Promise<number>
}

export interface SyncableRepository<T> extends BaseRepository<T> {
  findPendingSync(): Promise<T[]>
  markAsSynced(id: string): Promise<void>
  markAsConflicted(id: string, conflictData: any): Promise<void>
  findConflicts(): Promise<any[]>
}
```

#### 2.1.2 Abstract Base Repository
**Create: `apps/frontend/src/repositories/base/BaseRepository.ts`**
```typescript
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../../db/connection'
import type { BaseRepository } from './types'

export abstract class AbstractBaseRepository<T extends { id: string }> 
  implements BaseRepository<T> {
  
  protected abstract tableName: string
  
  protected async getDb() {
    return await getDatabase()
  }
  
  protected generateId(): string {
    return uuidv4().replace(/-/g, '').substring(0, 21) // Match nanoid format
  }
  
  protected now(): string {
    return new Date().toISOString()
  }
  
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  abstract update(id: string, data: Partial<T>): Promise<T>
  abstract delete(id: string): Promise<void>
  abstract findById(id: string): Promise<T | null>
  abstract findAll(filters?: Record<string, any>): Promise<T[]>
  abstract count(filters?: Record<string, any>): Promise<number>
  
  protected buildWhereClause(filters?: Record<string, any>): { clause: string, params: any[] } {
    if (!filters || Object.keys(filters).length === 0) {
      return { clause: '', params: [] }
    }
    
    const conditions: string[] = []
    const params: any[] = []
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
    })
    
    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    }
  }
}
```

### Step 2.2: Implement Local Repositories

#### 2.2.1 Local User Repository
**Create: `apps/frontend/src/repositories/local/LocalUserRepository.ts`**
```typescript
import { AbstractBaseRepository } from '../base/BaseRepository'
import type { User } from '../../db/schema'
import type { SyncableRepository } from '../base/types'

export class LocalUserRepository extends AbstractBaseRepository<User> 
  implements SyncableRepository<User> {
  
  protected tableName = 'users'
  
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const db = await this.getDb()
    const id = this.generateId()
    const now = this.now()
    
    const user: User = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }
    
    await db.execute(
      `INSERT INTO users (
        id, name, email, password, role, active, reset_token, reset_token_expiry,
        created_at, updated_at, sync_status, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, user.name, user.email, user.password, user.role, user.active,
        user.resetToken, user.resetTokenExpiry, user.createdAt, user.updatedAt,
        user.syncStatus, user.isDeleted
      ]
    )
    
    // Log sync operation
    await this.logSyncOperation(user.id, 'INSERT')
    
    return user
  }
  
  async update(id: string, data: Partial<User>): Promise<User> {
    const db = await this.getDb()
    const now = this.now()
    
    const updateData = { ...data, updatedAt: now, syncStatus: 'pending' }
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(updateData), id]
    
    await db.execute(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      values
    )
    
    // Log sync operation
    await this.logSyncOperation(id, 'UPDATE')
    
    const updated = await this.findById(id)
    if (!updated) throw new Error(`User with id ${id} not found after update`)
    return updated
  }
  
  async delete(id: string): Promise<void> {
    const db = await this.getDb()
    const now = this.now()
    
    // Soft delete
    await db.execute(
      `UPDATE users SET is_deleted = 1, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [now, id]
    )
    
    // Log sync operation
    await this.logSyncOperation(id, 'DELETE')
  }
  
  async findById(id: string): Promise<User | null> {
    const db = await this.getDb()
    const result = await db.select<User[]>(
      'SELECT * FROM users WHERE id = ? AND is_deleted = 0',
      [id]
    )
    return result.length > 0 ? result[0] : null
  }
  
  async findAll(filters?: Record<string, any>): Promise<User[]> {
    const db = await this.getDb()
    const { clause, params } = this.buildWhereClause({
      ...filters,
      is_deleted: 0
    })
    
    const query = `SELECT * FROM users ${clause} ORDER BY created_at DESC`
    return await db.select<User[]>(query, params)
  }
  
  async count(filters?: Record<string, any>): Promise<number> {
    const db = await this.getDb()
    const { clause, params } = this.buildWhereClause({
      ...filters,
      is_deleted: 0
    })
    
    const result = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM users ${clause}`,
      params
    )
    return result[0]?.count || 0
  }
  
  // Sync-specific methods
  async findPendingSync(): Promise<User[]> {
    return this.findAll({ sync_status: 'pending' })
  }
  
  async markAsSynced(id: string): Promise<void> {
    const db = await this.getDb()
    const now = this.now()
    
    await db.execute(
      'UPDATE users SET sync_status = "synced", last_synced = ? WHERE id = ?',
      [now, id]
    )
  }
  
  async markAsConflicted(id: string, conflictData: any): Promise<void> {
    const db = await this.getDb()
    
    await db.execute(
      'UPDATE users SET sync_status = "conflict" WHERE id = ?',
      [id]
    )
    
    // Store conflict data
    await db.execute(
      `INSERT INTO sync_conflicts (id, table_name, entity_id, local_data, remote_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.generateId(),
        'users',
        id,
        JSON.stringify(await this.findById(id)),
        JSON.stringify(conflictData),
        this.now()
      ]
    )
  }
  
  async findConflicts(): Promise<any[]> {
    const db = await this.getDb()
    return await db.select(
      'SELECT * FROM sync_conflicts WHERE table_name = "users" AND resolved = 0'
    )
  }
  
  private async logSyncOperation(entityId: string, operation: 'INSERT' | 'UPDATE' | 'DELETE'): Promise<void> {
    const db = await this.getDb()
    await db.execute(
      `INSERT INTO sync_log (id, table_name, entity_id, operation, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [this.generateId(), 'users', entityId, operation, this.now()]
    )
  }
}
```

#### 2.2.2 Create Other Local Repositories
Following the same pattern, create:
- **LocalProductRepository.ts**
- **LocalCategoryRepository.ts**
- **LocalCustomerRepository.ts**
- **LocalOrderRepository.ts**

### Step 2.3: Create Unified Sync Repositories

#### 2.3.1 Sync User Repository
**Create: `apps/frontend/src/repositories/sync/SyncUserRepository.ts`**
```typescript
import { LocalUserRepository } from '../local/LocalUserRepository'
import { userApi } from '../../api/users'
import type { User } from '../../db/schema'
import type { BaseRepository } from '../base/types'

export class SyncUserRepository implements BaseRepository<User> {
  private localRepo = new LocalUserRepository()
  
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Always create locally first
    const user = await this.localRepo.create(data)
    
    // Try to sync immediately if online
    try {
      await this.syncToRemote(user)
    } catch (error) {
      console.log('Failed to sync new user immediately, will retry later:', error)
    }
    
    return user
  }
  
  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.localRepo.update(id, data)
    
    // Try to sync immediately if online
    try {
      await this.syncToRemote(user)
    } catch (error) {
      console.log('Failed to sync updated user immediately, will retry later:', error)
    }
    
    return user
  }
  
  async delete(id: string): Promise<void> {
    await this.localRepo.delete(id)
    
    // Try to sync deletion immediately if online
    try {
      await userApi.delete(id)
      await this.localRepo.markAsSynced(id)
    } catch (error) {
      console.log('Failed to sync user deletion immediately, will retry later:', error)
    }
  }
  
  async findById(id: string): Promise<User | null> {
    return await this.localRepo.findById(id)
  }
  
  async findAll(filters?: Record<string, any>): Promise<User[]> {
    return await this.localRepo.findAll(filters)
  }
  
  async count(filters?: Record<string, any>): Promise<number> {
    return await this.localRepo.count(filters)
  }
  
  private async syncToRemote(user: User): Promise<void> {
    try {
      if (user.syncStatus === 'pending') {
        // Determine if this is a create or update operation
        const existsRemotely = await this.checkIfExistsRemotely(user.id)
        
        if (existsRemotely) {
          await userApi.update(user.id, user)
        } else {
          await userApi.create(user)
        }
        
        await this.localRepo.markAsSynced(user.id)
      }
    } catch (error) {
      console.error('Failed to sync user to remote:', error)
      throw error
    }
  }
  
  private async checkIfExistsRemotely(id: string): Promise<boolean> {
    try {
      await userApi.getById(id)
      return true
    } catch (error) {
      return false
    }
  }
}
```

### Step 2.4: Connection State Management

#### 2.4.1 Connection Monitor
**Create: `apps/frontend/src/sync/ConnectionMonitor.ts`**
```typescript
import { EventEmitter } from 'events'

export class ConnectionMonitor extends EventEmitter {
  private isOnline: boolean = navigator.onLine
  private checkInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 5000 // 5 seconds
  
  constructor() {
    super()
    this.setupEventListeners()
    this.startPeriodicCheck()
  }
  
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }
  
  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true
      this.emit('online')
    }
  }
  
  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false
      this.emit('offline')
    }
  }
  
  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkConnection()
    }, this.CHECK_INTERVAL)
  }
  
  private async checkConnection(): Promise<void> {
    try {
      // Try to reach the backend API
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        timeout: 5000 
      } as RequestInit)
      
      if (response.ok && !this.isOnline) {
        this.handleOnline()
      }
    } catch (error) {
      if (this.isOnline) {
        this.handleOffline()
      }
    }
  }
  
  public getStatus(): boolean {
    return this.isOnline
  }
  
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor()
```

### Step 2.5: Create Connection-Aware Store

#### 2.5.1 Offline Store
**Create: `apps/frontend/src/store/offlineStore.ts`**
```typescript
import { create } from 'zustand'
import { connectionMonitor } from '../sync/ConnectionMonitor'

interface OfflineState {
  isOnline: boolean
  pendingSyncCount: number
  lastSyncTime: Date | null
  syncInProgress: boolean
  setOnline: (online: boolean) => void
  setPendingSyncCount: (count: number) => void
  setLastSyncTime: (time: Date) => void
  setSyncInProgress: (inProgress: boolean) => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: connectionMonitor.getStatus(),
  pendingSyncCount: 0,
  lastSyncTime: null,
  syncInProgress: false,
  setOnline: (online) => set({ isOnline: online }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setSyncInProgress: (inProgress) => set({ syncInProgress: inProgress })
}))

// Set up connection monitoring
connectionMonitor.on('online', () => {
  useOfflineStore.getState().setOnline(true)
})

connectionMonitor.on('offline', () => {
  useOfflineStore.getState().setOnline(false)
})
```

### Step 2.6: Test Data Layer

#### 2.6.1 Create Data Layer Test Component
**Create: `apps/frontend/src/components/DataLayerTest.tsx`**
```typescript
import React, { useState } from 'react'
import { SyncUserRepository } from '../repositories/sync/SyncUserRepository'
import { useOfflineStore } from '../store/offlineStore'

const userRepo = new SyncUserRepository()

export default function DataLayerTest() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { isOnline, pendingSyncCount } = useOfflineStore()
  
  const createTestUser = async () => {
    setLoading(true)
    try {
      const user = await userRepo.create({
        name: `Test User ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'test123',
        role: 'waitress',
        active: true,
        syncStatus: 'pending',
        isDeleted: false
      })
      console.log('Created user:', user)
      await loadUsers()
    } catch (error) {
      console.error('Failed to create user:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadUsers = async () => {
    setLoading(true)
    try {
      const allUsers = await userRepo.findAll()
      setUsers(allUsers)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">Data Layer Test</h3>
      <div className="mb-4">
        <p>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
        <p>Pending Sync: {pendingSyncCount}</p>
      </div>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={createTestUser} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Create Test User
        </button>
        <button 
          onClick={loadUsers} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Load Users
        </button>
      </div>
      
      <div>
        <h4 className="font-semibold">Users ({users.length}):</h4>
        <ul className="text-sm">
          {users.map(user => (
            <li key={user.id} className="mb-1">
              {user.name} - {user.email} - Status: {user.syncStatus}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

---

## PHASE 3: Sync Engine Implementation (Week 5-8)

### Step 3.1: Sync Engine Core

#### 3.1.1 Change Tracker
**Create: `apps/frontend/src/sync/ChangeTracker.ts`**
```typescript
import { getDatabase } from '../db/connection'
import type { SyncLog } from '../db/schema'

export class ChangeTracker {
  async getPendingChanges(): Promise<SyncLog[]> {
    const db = await getDatabase()
    return await db.select<SyncLog[]>(
      'SELECT * FROM sync_log WHERE sync_status = "pending" ORDER BY created_at ASC'
    )
  }
  
  async markChangeAsSynced(changeId: string): Promise<void> {
    const db = await getDatabase()
    await db.execute(
      'UPDATE sync_log SET sync_status = "synced" WHERE id = ?',
      [changeId]
    )
  }
  
  async markChangeAsError(changeId: string, errorMessage: string): Promise<void> {
    const db = await getDatabase()
    await db.execute(
      'UPDATE sync_log SET sync_status = "error", error_message = ? WHERE id = ?',
      [errorMessage, changeId]
    )
  }
  
  async getPendingCount(): Promise<number> {
    const db = await getDatabase()
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM sync_log WHERE sync_status = "pending"'
    )
    return result[0]?.count || 0
  }
}
```

#### 3.1.2 Conflict Resolver
**Create: `apps/frontend/src/sync/ConflictResolver.ts`**
```typescript
export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual'
  resolvedData?: any
  requiresUserInput: boolean
}

export class ConflictResolver {
  async resolveConflict(
    tableName: string,
    entityId: string,
    localData: any,
    remoteData: any
  ): Promise<ConflictResolution> {
    
    // Business logic for automatic resolution
    switch (tableName) {
      case 'products':
        return this.resolveProductConflict(localData, remoteData)
      case 'orders':
        return this.resolveOrderConflict(localData, remoteData)
      case 'customers':
        return this.resolveCustomerConflict(localData, remoteData)
      default:
        return this.resolveGenericConflict(localData, remoteData)
    }
  }
  
  private resolveProductConflict(local: any, remote: any): ConflictResolution {
    // For products, prioritize stock updates from local (POS transactions)
    // but use remote for other fields if they're newer
    if (local.stock !== remote.stock) {
      return {
        strategy: 'merge',
        resolvedData: {
          ...remote,
          stock: local.stock, // Local stock takes precedence
          updatedAt: new Date().toISOString()
        },
        requiresUserInput: false
      }
    }
    
    // For other changes, use timestamp-based resolution
    const localTime = new Date(local.updatedAt).getTime()
    const remoteTime = new Date(remote.updatedAt).getTime()
    
    return {
      strategy: localTime > remoteTime ? 'local' : 'remote',
      requiresUserInput: false
    }
  }
  
  private resolveOrderConflict(local: any, remote: any): ConflictResolution {
    // Orders should generally not be modified once created
    // If there's a conflict, it likely needs manual resolution
    return {
      strategy: 'manual',
      requiresUserInput: true
    }
  }
  
  private resolveCustomerConflict(local: any, remote: any): ConflictResolution {
    // For customers, merge non-conflicting fields
    const merged = { ...remote }
    
    // Prefer local changes for contact information
    if (local.phone !== remote.phone) {
      merged.phone = local.phone
    }
    if (local.address !== remote.address) {
      merged.address = local.address
    }
    
    return {
      strategy: 'merge',
      resolvedData: merged,
      requiresUserInput: false
    }
  }
  
  private resolveGenericConflict(local: any, remote: any): ConflictResolution {
    // Generic timestamp-based resolution
    const localTime = new Date(local.updatedAt).getTime()
    const remoteTime = new Date(remote.updatedAt).getTime()
    
    if (Math.abs(localTime - remoteTime) < 1000) { // Within 1 second
      return {
        strategy: 'manual',
        requiresUserInput: true
      }
    }
    
    return {
      strategy: localTime > remoteTime ? 'local' : 'remote',
      requiresUserInput: false
    }
  }
}
```

#### 3.1.3 Sync Engine Core
**Create: `apps/frontend/src/sync/SyncEngine.ts`**
```typescript
import { ChangeTracker } from './ChangeTracker'
import { ConflictResolver } from './ConflictResolver'
import { connectionMonitor } from './ConnectionMonitor'
import { useOfflineStore } from '../store/offlineStore'
import { userApi, productApi, categoryApi, customerApi, orderApi } from '../api'
import {
  LocalUserRepository,
  LocalProductRepository,
  LocalCategoryRepository,
  LocalCustomerRepository,
  LocalOrderRepository
} from '../repositories/local'

export class SyncEngine {
  private changeTracker = new ChangeTracker()
  private conflictResolver = new ConflictResolver()
  private syncInterval: NodeJS.Timeout | null = null
  private isSyncing = false
  
  // Repository instances
  private repos = {
    users: new LocalUserRepository(),
    products: new LocalProductRepository(),
    categories: new LocalCategoryRepository(),
    customers: new LocalCustomerRepository(),
    orders: new LocalOrderRepository()
  }
  
  // API instances
  private apis = {
    users: userApi,
    products: productApi,
    categories: categoryApi,
    customers: customerApi,
    orders: orderApi
  }
  
  constructor() {
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    connectionMonitor.on('online', () => {
      this.startSync()
    })
    
    connectionMonitor.on('offline', () => {
      this.stopSync()
    })
  }
  
  public startSync(): void {
    if (this.syncInterval) return
    
    // Initial sync
    this.performSync()
    
    // Schedule periodic sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      this.performSync()
    }, 30000)
  }
  
  public stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
  
  public async performSync(): Promise<void> {
    if (this.isSyncing || !connectionMonitor.getStatus()) {
      return
    }
    
    this.isSyncing = true
    useOfflineStore.getState().setSyncInProgress(true)
    
    try {
      console.log('Starting sync process...')
      
      // Step 1: Upload local changes
      await this.uploadLocalChanges()
      
      // Step 2: Download remote changes
      await this.downloadRemoteChanges()
      
      // Step 3: Update sync status
      await this.updateSyncStatus()
      
      console.log('Sync completed successfully')
      
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.isSyncing = false
      useOfflineStore.getState().setSyncInProgress(false)
      useOfflineStore.getState().setLastSyncTime(new Date())
    }
  }
  
  private async uploadLocalChanges(): Promise<void> {
    const pendingChanges = await this.changeTracker.getPendingChanges()
    console.log(`Uploading ${pendingChanges.length} local changes...`)
    
    for (const change of pendingChanges) {
      try {
        await this.uploadSingleChange(change)
        await this.changeTracker.markChangeAsSynced(change.id)
      } catch (error) {
        console.error(`Failed to upload change ${change.id}:`, error)
        await this.changeTracker.markChangeAsError(
          change.id, 
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
  }
  
  private async uploadSingleChange(change: any): Promise<void> {
    const repo = this.repos[change.tableName as keyof typeof this.repos]
    const api = this.apis[change.tableName as keyof typeof this.apis]
    
    if (!repo || !api) {
      throw new Error(`No repository or API found for table: ${change.tableName}`)
    }
    
    const localEntity = await repo.findById(change.entityId)
    if (!localEntity) {
      throw new Error(`Entity ${change.entityId} not found locally`)
    }
    
    switch (change.operation) {
      case 'INSERT':
        await api.create(localEntity)
        break
      case 'UPDATE':
        await api.update(change.entityId, localEntity)
        break
      case 'DELETE':
        await api.delete(change.entityId)
        break
    }
  }
  
  private async downloadRemoteChanges(): Promise<void> {
    console.log('Downloading remote changes...')
    
    // Get last sync timestamp for incremental sync
    const lastSync = useOfflineStore.getState().lastSyncTime
    
    for (const [tableName, api] of Object.entries(this.apis)) {
      try {
        // Fetch changes since last sync
        const remoteChanges = await api.getChangesSince?.(lastSync) || []
        
        for (const remoteEntity of remoteChanges) {
          await this.processRemoteChange(tableName, remoteEntity)
        }
      } catch (error) {
        console.error(`Failed to download changes for ${tableName}:`, error)
      }
    }
  }
  
  private async processRemoteChange(tableName: string, remoteEntity: any): Promise<void> {
    const repo = this.repos[tableName as keyof typeof this.repos]
    if (!repo) return
    
    const localEntity = await repo.findById(remoteEntity.id)
    
    if (!localEntity) {
      // New entity from remote
      await this.insertRemoteEntity(tableName, remoteEntity)
    } else if (localEntity.syncStatus === 'synced') {
      // Update local entity with remote data
      await this.updateLocalEntity(tableName, remoteEntity)
    } else {
      // Potential conflict - entity has local changes
      await this.handleSyncConflict(tableName, localEntity, remoteEntity)
    }
  }
  
  private async insertRemoteEntity(tableName: string, remoteEntity: any): Promise<void> {
    const repo = this.repos[tableName as keyof typeof this.repos]
    
    // Create local copy with synced status
    const localEntity = {
      ...remoteEntity,
      syncStatus: 'synced',
      lastSynced: new Date().toISOString()
    }
    
    // Direct database insert to avoid triggering sync log
    // Implementation depends on the specific repository
    await (repo as any).insertWithoutSync(localEntity)
  }
  
  private async updateLocalEntity(tableName: string, remoteEntity: any): Promise<void> {
    const repo = this.repos[tableName as keyof typeof this.repos]
    
    const updateData = {
      ...remoteEntity,
      syncStatus: 'synced',
      lastSynced: new Date().toISOString()
    }
    
    await (repo as any).updateWithoutSync(remoteEntity.id, updateData)
  }
  
  private async handleSyncConflict(
    tableName: string, 
    localEntity: any, 
    remoteEntity: any
  ): Promise<void> {
    const resolution = await this.conflictResolver.resolveConflict(
      tableName,
      localEntity.id,
      localEntity,
      remoteEntity
    )
    
    const repo = this.repos[tableName as keyof typeof this.repos]
    
    if (resolution.requiresUserInput) {
      // Mark as conflict for manual resolution
      await (repo as any).markAsConflicted(localEntity.id, remoteEntity)
    } else {
      // Apply automatic resolution
      let resolvedData
      switch (resolution.strategy) {
        case 'local':
          resolvedData = localEntity
          break
        case 'remote':
          resolvedData = remoteEntity
          break
        case 'merge':
          resolvedData = resolution.resolvedData
          break
      }
      
      if (resolvedData) {
        resolvedData.syncStatus = 'synced'
        resolvedData.lastSynced = new Date().toISOString()
        await (repo as any).updateWithoutSync(localEntity.id, resolvedData)
      }
    }
  }
  
  private async updateSyncStatus(): Promise<void> {
    const pendingCount = await this.changeTracker.getPendingCount()
    useOfflineStore.getState().setPendingSyncCount(pendingCount)
  }
}

// Singleton instance
export const syncEngine = new SyncEngine()
```

### Step 3.2: Backend Sync Endpoints

#### 3.2.1 Add Sync Controller
**Create: `apps/backend/src/controllers/sync.ts`**
```typescript
import { Request, Response } from 'express'
import { db } from '../db'
import { users, products, categories, customers, orders } from '../db/schema'
import { gte, sql } from 'drizzle-orm'

export const getSyncData = async (req: Request, res: Response) => {
  try {
    const { since } = req.query
    const sinceDate = since ? new Date(since as string) : new Date(0)
    
    // Get all changes since the specified timestamp
    const [usersData, productsData, categoriesData, customersData, ordersData] = await Promise.all([
      db.select().from(users).where(gte(users.updatedAt, sinceDate)),
      db.select().from(products).where(gte(products.updatedAt, sinceDate)),
      db.select().from(categories).where(gte(categories.updatedAt, sinceDate)),
      db.select().from(customers).where(gte(customers.updatedAt, sinceDate)),
      db.select().from(orders).where(gte(orders.updatedAt, sinceDate))
    ])
    
    res.json({
      users: usersData,
      products: productsData,
      categories: categoriesData,
      customers: customersData,
      orders: ordersData,
      syncTimestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Sync data fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch sync data' })
  }
}

export const handleBulkSync = async (req: Request, res: Response) => {
  try {
    const { operations } = req.body
    const results: any[] = []
    
    // Process operations in transaction
    await db.transaction(async (tx) => {
      for (const operation of operations) {
        try {
          const result = await processSyncOperation(tx, operation)
          results.push({ id: operation.id, status: 'success', data: result })
        } catch (error) {
          results.push({ 
            id: operation.id, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    })
    
    res.json({ results })
  } catch (error) {
    console.error('Bulk sync error:', error)
    res.status(500).json({ error: 'Bulk sync failed' })
  }
}

async function processSyncOperation(tx: any, operation: any) {
  const { table, type, id, data } = operation
  
  switch (table) {
    case 'users':
      return await processSyncForTable(tx, users, type, id, data)
    case 'products':
      return await processSyncForTable(tx, products, type, id, data)
    case 'categories':
      return await processSyncForTable(tx, categories, type, id, data)
    case 'customers':
      return await processSyncForTable(tx, customers, type, id, data)
    case 'orders':
      return await processSyncForTable(tx, orders, type, id, data)
    default:
      throw new Error(`Unsupported table: ${table}`)
  }
}

async function processSyncForTable(tx: any, table: any, type: string, id: string, data: any) {
  switch (type) {
    case 'INSERT':
      return await tx.insert(table).values(data).returning()
    case 'UPDATE':
      return await tx.update(table).set(data).where(sql`${table.id} = ${id}`).returning()
    case 'DELETE':
      return await tx.delete(table).where(sql`${table.id} = ${id}`).returning()
    default:
      throw new Error(`Unsupported operation type: ${type}`)
  }
}
```

#### 3.2.2 Add Sync Routes
**Create: `apps/backend/src/routes/sync.ts`**
```typescript
import express from 'express'
import { authMiddleware } from '../middleware/auth'
import { getSyncData, handleBulkSync } from '../controllers/sync'

const router = express.Router()

// Get incremental sync data
router.get('/data', authMiddleware, getSyncData)

// Handle bulk sync operations
router.post('/bulk', authMiddleware, handleBulkSync)

// Health check for sync
router.head('/health', (req, res) => {
  res.status(200).end()
})

export default router
```

#### 3.2.3 Register Sync Routes
**Update: `apps/backend/src/index.ts`**
```typescript
import syncRoutes from './routes/sync'

// Add to existing route registrations
app.use('/api/sync', syncRoutes)
```

---

## PHASE 4: UI Integration (Week 9-10)

### Step 4.1: Offline Indicator Component

#### 4.1.1 Status Indicator
**Create: `apps/frontend/src/components/OfflineIndicator.tsx`**
```typescript
import React from 'react'
import { useOfflineStore } from '../store/offlineStore'
import { WifiIcon, WifiSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function OfflineIndicator() {
  const { isOnline, syncInProgress, pendingSyncCount, lastSyncTime } = useOfflineStore()
  
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    
    return date.toLocaleTimeString()
  }
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      {/* Connection Status */}
      <div className={`flex items-center space-x-1 ${
        isOnline ? 'text-green-600' : 'text-red-600'
      }`}>
        {isOnline ? (
          <WifiIcon className="w-4 h-4" />
        ) : (
          <WifiSlashIcon className="w-4 h-4" />
        )}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>
      
      {/* Sync Status */}
      {isOnline && (
        <>
          <span className="text-gray-400">|</span>
          <div className="flex items-center space-x-1">
            {syncInProgress ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-blue-600">Syncing...</span>
              </>
            ) : (
              <>
                {pendingSyncCount > 0 ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    {pendingSyncCount} pending
                  </span>
                ) : (
                  <span className="text-green-600">Up to date</span>
                )}
              </>
            )}
          </div>
        </>
      )}
      
      {/* Last Sync Time */}
      {isOnline && !syncInProgress && (
        <>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">
            Last sync: {formatLastSync(lastSyncTime)}
          </span>
        </>
      )}
      
      {/* Offline Indicator */}
      {!isOnline && pendingSyncCount > 0 && (
        <>
          <span className="text-gray-400">|</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
            {pendingSyncCount} changes to sync
          </span>
        </>
      )}
    </div>
  )
}
```

#### 4.1.2 Sync Control Panel
**Create: `apps/frontend/src/components/SyncControlPanel.tsx`**
```typescript
import React, { useState } from 'react'
import { syncEngine } from '../sync/SyncEngine'
import { useOfflineStore } from '../store/offlineStore'
import { Button } from './button'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function SyncControlPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [manualSyncing, setManualSyncing] = useState(false)
  const { isOnline, syncInProgress, pendingSyncCount } = useOfflineStore()
  
  const handleManualSync = async () => {
    setManualSyncing(true)
    try {
      await syncEngine.performSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setManualSyncing(false)
    }
  }
  
  const handleForceSync = async () => {
    // Implementation for force sync (ignoring conflicts temporarily)
    console.log('Force sync requested')
  }
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        Sync Settings
      </Button>
      
      <Dialog open={isOpen} onClose={setIsOpen} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-w-md mx-auto bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <DialogTitle className="text-lg font-semibold mb-4">
                Sync Control Panel
              </DialogTitle>
              
              <div className="space-y-4">
                {/* Status */}
                <div className="p-3 border rounded">
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="text-sm space-y-1">
                    <p>Connection: {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
                    <p>Pending Changes: {pendingSyncCount}</p>
                    <p>Sync Status: {syncInProgress ? 'In Progress' : 'Idle'}</p>
                  </div>
                </div>
                
                {/* Manual Sync */}
                <div>
                  <Button
                    onClick={handleManualSync}
                    disabled={!isOnline || manualSyncing || syncInProgress}
                    className="w-full"
                  >
                    {manualSyncing ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2" />
                        Manual Sync
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Force Sync (for emergencies) */}
                {pendingSyncCount > 0 && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={handleForceSync}
                      disabled={!isOnline || syncInProgress}
                      className="w-full text-orange-600 border-orange-600"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                      Force Sync (Override Conflicts)
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Use only if regular sync fails repeatedly
                    </p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
```

### Step 4.2: Update Main Layout

#### 4.2.1 Add Offline Indicators to Navigation
**Update: `apps/frontend/src/components/navbar.tsx`**
```typescript
import OfflineIndicator from './OfflineIndicator'
import SyncControlPanel from './SyncControlPanel'

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Existing navbar content */}
          
          {/* Add offline indicators */}
          <div className="flex items-center space-x-4">
            <OfflineIndicator />
            <SyncControlPanel />
            
            {/* Existing user menu, etc. */}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

### Step 4.3: Conflict Resolution UI

#### 4.3.1 Conflict Resolution Dialog
**Create: `apps/frontend/src/components/ConflictResolutionDialog.tsx`**
```typescript
import React, { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Button } from './button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConflictResolutionProps {
  isOpen: boolean
  onClose: () => void
  conflicts: any[]
  onResolve: (conflictId: string, resolution: 'local' | 'remote', data?: any) => void
}

export default function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflicts,
  onResolve
}: ConflictResolutionProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | null>(null)
  
  const currentConflict = conflicts[currentConflictIndex]
  
  if (!currentConflict) return null
  
  const localData = JSON.parse(currentConflict.localData)
  const remoteData = JSON.parse(currentConflict.remoteData)
  
  const handleResolve = () => {
    if (!selectedResolution) return
    
    onResolve(currentConflict.id, selectedResolution)
    
    // Move to next conflict or close if done
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1)
      setSelectedResolution(null)
    } else {
      onClose()
    }
  }
  
  const renderDataComparison = (field: string, localValue: any, remoteValue: any) => {
    const isDifferent = localValue !== remoteValue
    
    return (
      <div key={field} className={`p-2 rounded ${isDifferent ? 'bg-yellow-50' : 'bg-gray-50'}`}>
        <div className="font-medium text-sm mb-1">{field}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-medium">Local Version</div>
            <div className="bg-white p-2 rounded border">{String(localValue)}</div>
          </div>
          <div>
            <div className="text-green-600 font-medium">Server Version</div>
            <div className="bg-white p-2 rounded border">{String(remoteValue)}</div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-2" />
              <DialogTitle className="text-lg font-semibold">
                Resolve Data Conflict ({currentConflictIndex + 1} of {conflicts.length})
              </DialogTitle>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Changes were made to the same {currentConflict.tableName} record both locally and on the server. 
                Please choose which version to keep:
              </p>
              
              <div className="bg-blue-50 p-3 rounded mb-4">
                <p className="text-sm">
                  <strong>Record ID:</strong> {currentConflict.entityId}<br/>
                  <strong>Table:</strong> {currentConflict.tableName}<br/>
                  <strong>Conflict Date:</strong> {new Date(currentConflict.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Data Comparison */}
            <div className="space-y-3 mb-6">
              {Object.keys(localData).map(field => 
                renderDataComparison(field, localData[field], remoteData[field])
              )}
            </div>
            
            {/* Resolution Options */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="resolution"
                    value="local"
                    checked={selectedResolution === 'local'}
                    onChange={(e) => setSelectedResolution('local')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">
                    <strong>Keep Local Version</strong> - Use the data from this device
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="resolution"
                    value="remote"
                    checked={selectedResolution === 'remote'}
                    onChange={(e) => setSelectedResolution('remote')}
                    className="text-green-600"
                  />
                  <span className="text-sm">
                    <strong>Keep Server Version</strong> - Use the data from the server
                  </span>
                </label>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel (Resolve Later)
              </Button>
              
              <div className="space-x-2">
                {currentConflictIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentConflictIndex(currentConflictIndex - 1)
                      setSelectedResolution(null)
                    }}
                  >
                    Previous
                  </Button>
                )}
                
                <Button
                  onClick={handleResolve}
                  disabled={!selectedResolution}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentConflictIndex < conflicts.length - 1 ? 'Resolve & Next' : 'Resolve & Finish'}
                </Button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

---

## PHASE 5: Testing & Optimization (Week 11-12)

### Step 5.1: Create Test Scripts

#### 5.1.1 Offline/Online Testing Component
**Create: `apps/frontend/src/components/OfflineTest.tsx`**
```typescript
import React, { useState } from 'react'
import { Button } from './button'
import { SyncUserRepository } from '../repositories/sync/SyncUserRepository'
import { useOfflineStore } from '../store/offlineStore'

const userRepo = new SyncUserRepository()

export default function OfflineTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const { isOnline } = useOfflineStore()
  
  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }
  
  const testOfflineCreate = async () => {
    try {
      addResult('Creating user while offline...')
      const user = await userRepo.create({
        name: `Offline User ${Date.now()}`,
        email: `offline${Date.now()}@test.com`,
        password: 'test123',
        role: 'waitress',
        active: true,
        syncStatus: 'pending',
        isDeleted: false
      })
      addResult(`✅ Created user offline: ${user.name} (${user.id})`)
    } catch (error) {
      addResult(`❌ Failed to create user offline: ${error}`)
    }
  }
  
  const testOfflineRead = async () => {
    try {
      addResult('Reading users while offline...')
      const users = await userRepo.findAll()
      addResult(`✅ Read ${users.length} users while offline`)
    } catch (error) {
      addResult(`❌ Failed to read users offline: ${error}`)
    }
  }
  
  const testSyncWhenOnline = async () => {
    if (!isOnline) {
      addResult('❌ Cannot test sync - currently offline')
      return
    }
    
    try {
      addResult('Testing sync process...')
      // Trigger manual sync through sync engine
      const { syncEngine } = await import('../sync/SyncEngine')
      await syncEngine.performSync()
      addResult('✅ Sync completed successfully')
    } catch (error) {
      addResult(`❌ Sync failed: ${error}`)
    }
  }
  
  const clearResults = () => {
    setTestResults([])
  }
  
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Offline/Sync Testing</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
        </p>
        <p className="text-sm text-gray-600">
          Use browser dev tools to simulate network conditions
        </p>
      </div>
      
      <div className="space-x-2 mb-4">
        <Button onClick={testOfflineCreate} size="sm">
          Test Offline Create
        </Button>
        <Button onClick={testOfflineRead} size="sm">
          Test Offline Read
        </Button>
        <Button onClick={testSyncWhenOnline} size="sm" disabled={!isOnline}>
          Test Sync
        </Button>
        <Button onClick={clearResults} variant="outline" size="sm">
          Clear Results
        </Button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto">
        <h4 className="font-medium mb-2">Test Results:</h4>
        {testResults.length === 0 ? (
          <p className="text-gray-500 text-sm">No tests run yet</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <p key={index} className="text-sm font-mono">{result}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Step 5.2: Performance Monitoring

#### 5.2.1 Sync Performance Monitor
**Create: `apps/frontend/src/sync/PerformanceMonitor.ts`**
```typescript
interface SyncMetrics {
  startTime: number
  endTime?: number
  duration?: number
  operationsCount: number
  successCount: number
  errorCount: number
  bytesTransferred?: number
}

export class SyncPerformanceMonitor {
  private metrics: Map<string, SyncMetrics> = new Map()
  
  startSync(syncId: string, operationsCount: number): void {
    this.metrics.set(syncId, {
      startTime: Date.now(),
      operationsCount,
      successCount: 0,
      errorCount: 0
    })
  }
  
  recordSuccess(syncId: string): void {
    const metrics = this.metrics.get(syncId)
    if (metrics) {
      metrics.successCount++
    }
  }
  
  recordError(syncId: string): void {
    const metrics = this.metrics.get(syncId)
    if (metrics) {
      metrics.errorCount++
    }
  }
  
  endSync(syncId: string): SyncMetrics | null {
    const metrics = this.metrics.get(syncId)
    if (metrics) {
      metrics.endTime = Date.now()
      metrics.duration = metrics.endTime - metrics.startTime
      return metrics
    }
    return null
  }
  
  getMetrics(syncId: string): SyncMetrics | null {
    return this.metrics.get(syncId) || null
  }
  
  getAllMetrics(): SyncMetrics[] {
    return Array.from(this.metrics.values())
  }
  
  clearMetrics(): void {
    this.metrics.clear()
  }
}

export const syncPerformanceMonitor = new SyncPerformanceMonitor()
```

### Step 5.3: Error Handling and Recovery

#### 5.3.1 Enhanced Error Handler
**Create: `apps/frontend/src/sync/ErrorHandler.ts`**
```typescript
interface SyncError {
  id: string
  type: 'network' | 'conflict' | 'validation' | 'server' | 'unknown'
  message: string
  timestamp: Date
  retryCount: number
  maxRetries: number
  context?: any
}

export class SyncErrorHandler {
  private errors: Map<string, SyncError> = new Map()
  private maxRetries = 3
  private retryDelays = [1000, 5000, 15000] // 1s, 5s, 15s
  
  recordError(
    id: string, 
    error: Error, 
    context?: any
  ): SyncError {
    const existingError = this.errors.get(id)
    const retryCount = existingError ? existingError.retryCount + 1 : 1
    
    const syncError: SyncError = {
      id,
      type: this.categorizeError(error),
      message: error.message,
      timestamp: new Date(),
      retryCount,
      maxRetries: this.maxRetries,
      context
    }
    
    this.errors.set(id, syncError)
    return syncError
  }
  
  private categorizeError(error: Error): SyncError['type'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network'
    }
    if (message.includes('conflict')) {
      return 'conflict'
    }
    if (message.includes('validation')) {
      return 'validation'
    }
    if (message.includes('server') || message.includes('500')) {
      return 'server'
    }
    
    return 'unknown'
  }
  
  shouldRetry(id: string): boolean {
    const error = this.errors.get(id)
    if (!error) return false
    
    return error.retryCount < error.maxRetries && 
           error.type !== 'validation' && 
           error.type !== 'conflict'
  }
  
  getRetryDelay(id: string): number {
    const error = this.errors.get(id)
    if (!error) return 0
    
    const delayIndex = Math.min(error.retryCount - 1, this.retryDelays.length - 1)
    return this.retryDelays[delayIndex]
  }
  
  clearError(id: string): void {
    this.errors.delete(id)
  }
  
  getErrors(): SyncError[] {
    return Array.from(this.errors.values())
  }
  
  getPermanentErrors(): SyncError[] {
    return this.getErrors().filter(error => !this.shouldRetry(error.id))
  }
}

export const syncErrorHandler = new SyncErrorHandler()
```

---

## FINAL TESTING AND DEPLOYMENT

### Testing Checklist

#### Phase 1 Tests
- [ ] Tauri SQL plugin installation successful
- [ ] SQLite database initialization works
- [ ] All tables created with proper schema
- [ ] Database connection management works
- [ ] Basic CRUD operations function

#### Phase 2 Tests  
- [ ] Repository pattern implementation complete
- [ ] Local repositories work offline
- [ ] Repository interfaces consistent
- [ ] Connection state detection accurate
- [ ] Offline store state management works

#### Phase 3 Tests
- [ ] Sync engine initializes properly
- [ ] Change tracking logs operations
- [ ] Conflict resolution logic works
- [ ] Upload/download processes function
- [ ] Backend sync endpoints respond
- [ ] Bulk sync operations work

#### Phase 4 Tests
- [ ] Offline indicators display correctly
- [ ] Sync control panel functions
- [ ] Conflict resolution UI works
- [ ] User can resolve conflicts manually
- [ ] UI updates reflect sync status

#### Phase 5 Tests
- [ ] Performance monitoring works
- [ ] Error handling is robust
- [ ] Recovery mechanisms function
- [ ] Edge cases handled properly
- [ ] User experience is smooth

### Deployment Steps

1. **Development Testing**
   ```bash
   pnpm tauri:dev
   # Test all offline/online scenarios
   ```

2. **Build for Production**
   ```bash
   pnpm build
   pnpm tauri:build
   ```

3. **Database Migration**
   ```bash
   pnpm db:migrate
   # Ensure PostgreSQL schema is up to date
   ```

4. **Deploy Backend**
   ```bash
   # Deploy updated backend with sync endpoints
   ```

5. **Deploy Desktop App**
   ```bash
   # Distribute Tauri app with SQLite integration
   ```

This comprehensive guide provides a complete roadmap for implementing offline-first functionality in your POS system, with detailed code examples and testing procedures for each phase.