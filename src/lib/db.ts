import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

// Ensure DATABASE_URL uses an absolute path for Render compatibility
function setupDatabaseUrl() {
  const dbDir = path.join(process.cwd(), 'db')
  const dbFile = path.join(dbDir, 'custom.db')

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`[DB] Created database directory: ${dbDir}`)
  }

  // Set absolute path so Prisma always finds it regardless of CWD changes
  process.env.DATABASE_URL = `file:${dbFile}`
}

// Initialize database tables if needed
function initializeDatabase() {
  const dbUrl = process.env.DATABASE_URL!
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl

  // If file doesn't exist or is empty, push schema
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
    console.log('[DB] Database missing or empty. Initializing schema...')

    // Create empty file first so better-sqlite3 can open it
    fs.writeFileSync(dbPath, '')

    // Try to push schema — check multiple possible prisma binary locations
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const prismaCandidates = [
      path.join(process.cwd(), 'node_modules', '.bin', 'prisma'),
      path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.bin', 'prisma'),
    ]

    const prismaBin = prismaCandidates.find(p => fs.existsSync(p))

    if (prismaBin && fs.existsSync(schemaPath)) {
      try {
        execSync(`"${prismaBin}" db push --skip-generate --schema="${schemaPath}"`, {
          stdio: 'pipe',
          timeout: 30000,
          env: { ...process.env },
        })
        console.log('[DB] Schema pushed successfully.')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[DB] prisma db push failed: ${msg}`)
      }
    } else {
      // Fallback: try npx/node
      try {
        execSync('npx prisma db push --skip-generate', {
          stdio: 'pipe',
          timeout: 30000,
          env: { ...process.env },
        })
        console.log('[DB] Schema pushed via npx successfully.')
      } catch {
        console.warn('[DB] Could not run prisma db push. Tables may be missing on first deploy.')
      }
    }
  }
}

// Run setup (server-side only)
if (typeof window === 'undefined') {
  setupDatabaseUrl()
  initializeDatabase()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db