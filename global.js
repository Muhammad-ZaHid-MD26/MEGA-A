import fs from 'fs'
import path from 'path'
import pino from 'pino'
import { fileURLToPath } from 'url'
import { Low, JSONFile } from 'lowdb'
import { makeInMemoryStore } from '@whiskeysockets/baileys'

// Get __dirname (ESM compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Logger setup
const logger = pino({ level: 'silent' })

// Setup database (lowdb)
const dbFile = path.join(__dirname, 'database.json')
const adapter = new JSONFile(dbFile)
const db = new Low(adapter)

await db.read()
if (!db.data) {
  db.data = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {} }
  await db.write()
}
global.db = db

// Setup memory store for Baileys
const store = makeInMemoryStore({ logger })
global.store = store

// Read existing session store
store?.readFromFile(path.join(__dirname, 'baileys_store.json'))

// Auto-save store every 10 seconds
setInterval(() => {
  store?.writeToFile(path.join(__dirname, 'baileys_store.json'))
}, 10000)

console.log('✅ global.js loaded successfully')
