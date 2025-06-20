
import dotenv from 'dotenv'
dotenv.config()

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { platform } from 'process'
import { existsSync, readFileSync, readdirSync, unlinkSync, watch } from 'fs'
import { spawn } from 'child_process'
import chalk from 'chalk'
import lodash, { chain } from 'lodash'
import { JSONFile, Low } from 'lowdb'
import NodeCache from 'node-cache'
import Pino from 'pino'
import syntaxError from 'syntax-error'
import { format } from 'util'
import yargs from 'yargs'
import readline from 'readline'
import ws from 'ws'

// ✅ Fixed Baileys Import
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  MessageRetryMap,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  Browsers,
  proto,
  delay,
  jidNormalizedUser
} from '@whiskeysockets/baileys'

import cloudDBAdapter from './lib/cloudDBAdapter.js'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import { protoType, serialize } from './lib/simple.js'
import socketInit from './lib/socket.js'
import tempClear from './lib/tempclear.js'

global.__filename = fileURLToPath(import.meta.url)
global.__dirname = dirname(global.__filename)
global.require = createRequire(import.meta.url)

const logger = Pino({ level: 'silent' })
const store = makeInMemoryStore({ logger })
store?.readFromFile('./session/store.json')
setInterval(() => {
  store?.writeToFile('./session/store.json')
}, 10_000)

const msgRetryCounterCache = new NodeCache()

async function loadDatabase() {
  global.DATABASE = new Low(new JSONFile('./database.json'))
  global.db = DATABASE
  await global.db.read()
  global.db.data ||= { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {} }
  global.db.chain = chain(global.db.data)
}
global.loadDatabase = loadDatabase

await loadDatabase()
protoType()
serialize()

const { state, saveCreds } = await useMultiFileAuthState('./session')
const connectionOptions = {
  version: await fetchLatestBaileysVersion(),
  logger,
  printQRInTerminal: true,
  browser: Browsers.macOS('Safari'),
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'silent' }))
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  getMessage: async key => {
    const jid = jidNormalizedUser(key.remoteJid)
    const msg = await store.loadMessage(jid, key.id)
    return msg?.message || ''
  },
  patchMessageBeforeSending: message => {
    if (message.buttonsMessage || message.listMessage || message.templateMessage)
      return {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadataVersion: 2,
              deviceListMetadata: {}
            },
            ...message
          }
        }
      }
    return message
  },
  msgRetryCounterCache,
  defaultQueryTimeoutMs: undefined,
  syncFullHistory: false
}

global.conn = makeWASocket(connectionOptions)
conn.isInit = false
store?.bind(conn.ev)
