import "dotenv/config.js"
import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg
import qrcode from "qrcode-terminal"

import terminal from "./utils/terminal.js"

if (process.env.FFMPEG_PATH === undefined) {
  throw new Error("FFMPEG_PATH is not defined")
}

const client = new Client({
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  authStrategy: new LocalAuth(),
  ffmpegPath: process.env.FFMPEG_PATH,
})

client.on("qr", (qr) => {
  terminal.info("QR Code received, scan it with your WhatsApp app to log in.")
  qrcode.generate(qr, { small: true })
})

let loadingPercent: number = 0

client.on("loading_screen", (percent) => {
  loadingPercent = Number(percent)
  terminal.info(`Loading: ${loadingPercent}%`)
})

client.on("ready", () => {
  terminal.info("WhatsApp Bot is running! CTRL + C to stop.")
})

client.on("message", async (message) => {
  if (loadingPercent < 99) return
  if (message.fromMe) return

  // TODO: Do the stuff here
})

client.initialize()

process.on("SIGINT", () => {
  terminal.info("Shutting down WhatsApp Bot!")
  client.destroy()
  process.exit(0)
})