// lib/socket.js

import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'

import { Boom } from '@hapi/boom' import pino from 'pino' import { join } from 'path' import { default as handler } from './handler.js'

const store = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ level: 'silent' }) }) store?.readFromFile('./session/store.json') setInterval(() => { store?.writeToFile('./session/store.json') }, 10000)

async function startSock() { const { state, saveCreds } = await useMultiFileAuthState('./session') const { version, isLatest } = await fetchLatestBaileysVersion() console.log(Using Baileys v${version.join('.')}, Latest: ${isLatest})

const sock = makeWASocket({ version, printQRInTerminal: true, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) }, logger: pino({ level: 'silent' }), browser: ['MEGA-AI','Chrome','110.0'], getMessage: async (key) => { if (store) { const msg = await store.loadMessage(key.remoteJid, key.id) return msg?.message || undefined } return undefined } })

store.bind(sock.ev)

sock.ev.on('messages.upsert', async ({ messages, type }) => { if (type !== 'notify') return const msg = messages[0] if (!msg.message) return await handler(sock, msg) })

sock.ev.on('connection.update', (update) => { const { connection, lastDisconnect } = update if (connection === 'close') { const shouldReconnect = (lastDisconnect?.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut console.log('Connection closed. Reconnecting...', shouldReconnect) if (shouldReconnect) startSock() } else if (connection === 'open') { console.log('✅ WhatsApp Connected') } })

sock.ev.on('creds.update', saveCreds)

return sock }

export default startSock

