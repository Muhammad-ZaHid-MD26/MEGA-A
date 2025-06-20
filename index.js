import express from 'express'
import { spawn } from 'child_process'
import chalk from 'chalk'
import figlet from 'figlet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { watchFile } from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const port = process.env.PORT || 3000

const app = express()
app.use(express.static(path.join(__dirname, 'assets')))
app.get('/', (_, res) => res.redirect('/global.html'))
app.listen(port, () => {
  console.log(chalk.green(`✅ Server is running on PORT: ${port}`))
})

figlet('MEGA-AI', (err, data) => {
  if (err) return console.log(chalk.red('❌ Figlet error:'), err)
  console.log(chalk.cyan(data))
})

let isRunning = false
async function start(file) {
  if (isRunning) return
  isRunning = true

  const args = [path.join(__dirname, file), ...process.argv.slice(2)]
  const p = spawn(process.argv[0], args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  })

  p.on('message', (msg) => console.log(chalk.yellow('🟡 Message:'), msg))
  p.on('exit', (code) => {
    console.log(chalk.red(`❌ Exited with code: ${code}`))
    isRunning = false
    if (code === 0) return
    start(file)
  })
  p.on('error', (err) => {
    console.log(chalk.red('❌ Error:'), err)
    isRunning = false
    start(file)
  })
}

start('bot.js')

process.on('uncaughtException', (err) => {
  console.error(chalk.red('❌ Uncaught Exception:'), err)
  start('bot.js')
})

process.on('unhandledRejection', (err) => {
  console.error(chalk.red('❌ Unhandled Rejection:'), err)
  start('bot.js')
})
